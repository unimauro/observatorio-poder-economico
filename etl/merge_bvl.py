#!/usr/bin/env python3
"""
Integra el universo de emisores BVL (compilado con fuentes por agentes web)
al seed_data.json. Idempotente: salta lo que ya existe por id.

Cada empresa nueva entra con bvl=true; ingresos/empleados quedan null (no se
inventan) y solo se carga market_cap cuando hay dato confiable. Los grupos
económicos nuevos se crean automáticamente; los existentes se reutilizan por alias.
"""
import json
from pathlib import Path

SEED = Path(__file__).resolve().parent / "seed" / "seed_data.json"

# Alias de grupos existentes (substring en minúsculas -> id de grupo del seed)
ALIAS = {
    "breca": "g-breca", "brescia": "g-breca", "gloria": "g-gloria",
    "romero": "g-romero", "credicorp": "g-credicorp", "intercorp": "g-intercorp",
    "falabella": "g-falabella", "hochschild": "g-hochschild",
    "benavides": "g-benavides", "buenaventura": "g-benavides",
    "ferreycorp": "g-ferreycorp",
}

# Grupos económicos nuevos: nombre_grupo -> (id, pais, control)
GRUPOS_NUEVOS = {
    "Grupo México": ("g-grupo-mexico", "México", "Germán Larrea (Grupo México)"),
    "Glencore": ("g-glencore", "Suiza", "Glencore plc"),
    "Votorantim": ("g-votorantim", "Brasil", "Familia Ermírio de Moraes (Votorantim/Nexa)"),
    "Shougang Group": ("g-shougang", "China", "Shougang Group (estatal China)"),
    "Repsol": ("g-repsol", "España", "Repsol S.A."),
    "UNACEM": ("g-unacem", "Perú", "Familia Rizo Patrón (Grupo UNACEM)"),
    "Aceros Arequipa": ("g-aceros-arequipa", "Perú", "Familia Cilloniz"),
    "Gerdau": ("g-gerdau", "Brasil", "Familia Gerdau Johannpeter"),
    "Engie": ("g-engie", "Francia", "ENGIE S.A."),
    "Actis": ("g-actis", "Reino Unido", "Actis (fondo) vía Niagara Energy"),
    "China Three Gorges": ("g-ctg", "China", "China Three Gorges Corp. (estatal)"),
    "Statkraft": ("g-statkraft", "Noruega", "Statkraft AS (estatal noruega)"),
    "Austevoll": ("g-austevoll", "Noruega", "Austevoll Seafood ASA"),
    "Grupo Pichincha": ("g-pichincha", "Ecuador", "Familia Egas (Banco Pichincha)"),
    "Grupo Coril": ("g-coril", "Perú", "Grupo Coril"),
    "Diviso": ("g-diviso", "Perú", "Diviso Grupo Financiero"),
    "BBVA Microfinanzas": ("g-bbva-mf", "España", "Fundación Microfinanzas BBVA"),
    "Grupo BVL": ("g-bvl", "Perú", "Bolsa de Valores de Lima (accionariado difundido)"),
    "Grupo La Positiva": ("g-la-positiva", "Perú", "Grupo La Positiva"),
    "Mapfre": ("g-mapfre", "España", "Mapfre S.A."),
    "Quálitas": ("g-qualitas", "México", "Quálitas Controladora"),
    "AB InBev": ("g-abinbev", "Bélgica", "Anheuser-Busch InBev"),
    "Grupo Cervesur": ("g-cervesur", "Perú", "Grupo Cervesur (familia Ricketts)"),
    "Arca Continental": ("g-arca", "México", "Arca Continental / Coca-Cola"),
    "Manuelita": ("g-manuelita", "Colombia", "Grupo Manuelita"),
    "Grupo Oviedo": ("g-oviedo", "Perú", "Grupo Oviedo"),
    "Grupo Wiese": ("g-wiese", "Perú", "Grupo Wiese"),
    "Grupo Raffo": ("g-raffo", "Perú", "Grupo Raffo (GR Holding)"),
    "Grupo Michell": ("g-michell", "Perú", "Familia Michell"),
    "Grupo El Comercio": ("g-el-comercio", "Perú", "Familia Miró Quesada"),
    "Grupo Matta": ("g-matta", "Perú", "Familia Matta Curotto"),
}

# Empresas nuevas BVL: (id, nombre, sector, grupo|None, pais, market_cap|None, nota)
F = "BVL — listado de emisores / SMV (verificado 2025)"
EMPRESAS = [
    # --- Minería ---
    ("southern-copper", "Southern Copper Corporation", "Minería", "Grupo México", "México", None, "Cobre (Toquepala, Cuajone); cotiza NYSE y BVL (SCCO/SPCCPI2)."),
    ("volcan", "Volcan Compañía Minera", "Minería", "Glencore", "Suiza", None, "Polimetálica (zinc, plomo, plata); controlada por Glencore (VOLCABC1)."),
    ("nexa-peru", "Nexa Resources Perú (ex Milpo)", "Minería", "Votorantim", "Brasil", None, "Zinc/cobre/plomo (Cerro Lindo, El Porvenir); Votorantim (NEXAPEC1)."),
    ("nexa-atacocha", "Nexa Resources Atacocha (ex Atacocha)", "Minería", "Votorantim", "Brasil", None, "Polimetálica controlada por Nexa Perú (ATACOBC1)."),
    ("sierra-metals", "Sierra Metals", "Minería", None, "Canadá", None, "Polimetálica (mina Yauricocha); cotiza Toronto/NYSE y BVL."),
    ("shougang-hierro", "Shougang Hierro Perú", "Minería", "Shougang Group", "China", 10710, "Único gran productor de hierro del país (Marcona). Cap ~S/10.7 mil M (SHPC1)."),
    ("poderosa", "Compañía Minera Poderosa", "Minería", None, "Perú", None, "Oro en Pataz (La Libertad); capital peruano (PODERC1)."),
    ("minera-irl", "Minera IRL", "Minería", None, "Reino Unido", None, "Junior de oro (proyecto Ollachea, Puno); trading limitado."),
    ("minera-corona", "Sociedad Minera Corona", "Minería", None, "Perú", None, "Polimetálica (mina Yauricocha, operada con Sierra Metals)."),
    ("minera-santa-luisa", "Compañía Minera Santa Luisa", "Minería", None, "Japón", None, "Polimetálica (Huanzalá, Pallca); ligada a Mitsui Mining."),
    ("simsa", "Minera San Ignacio de Morococha (SIMSA)", "Minería", None, "Perú", None, "Polimetálica en Junín; capital peruano."),
    ("minera-andina-expl", "Minera Andina de Exploraciones", "Minería", None, "Perú", None, "Junior de exploración polimetálica; trading reducido."),
    # --- Energía y combustibles ---
    ("petroperu", "Petroperú", "Energía y combustibles", None, "Perú", None, "Petrolera estatal (Refinería de Talara); emisor de bonos (FONAFE)."),
    ("relapasa", "Refinería La Pampilla (Relapasa)", "Energía y combustibles", "Repsol", "España", None, "Principal refinería privada; controlada por Repsol (RELAPAC1)."),
    # --- Servicios públicos (utilities) ---
    ("engie-peru", "ENGIE Energía Perú (ex EnerSur)", "Servicios públicos", "Engie", "Francia", None, "Generación térmica, hidro y renovable (ENGIEC1)."),
    ("orygen-peru", "Orygen Perú (ex Enel Generación / Edegel)", "Servicios públicos", "Actis", "Reino Unido", None, "Principal generadora privada; ex Enel, hoy Actis/Niagara (ORYGENC1)."),
    ("enel-distribucion", "Enel Distribución Perú (ex Edelnor)", "Servicios públicos", "Actis", "Reino Unido", None, "Distribuidora de Lima norte; ex Enel, hoy Actis/Niagara."),
    ("luz-del-sur", "Luz del Sur", "Servicios públicos", "China Three Gorges", "China", None, "Distribuidora de Lima sur; controlada por China Three Gorges (LUSURC1)."),
    ("electro-dunas", "Electro Dunas", "Servicios públicos", None, "Perú", None, "Distribuidora del centro-sur (Ica, Huancavelica, Ayacucho)."),
    ("statkraft-peru", "Statkraft Perú", "Servicios públicos", "Statkraft", "Noruega", None, "Generadora hidroeléctrica (ex SN Power/Cheves); emisor de deuda."),
    ("celepsa", "CELEPSA (El Platanal)", "Servicios públicos", "UNACEM", "Perú", None, "Hidroeléctrica El Platanal (Cañete) del Grupo UNACEM."),
    # --- Cemento y construcción ---
    ("unacem", "UNACEM Corp", "Cemento y construcción", "UNACEM", "Perú", None, "Mayor cementera del país (Andino + Atocongo) (UNACEMC1)."),
    # --- Industria y maquinaria ---
    ("aceros-arequipa", "Corporación Aceros Arequipa", "Industria y maquinaria", "Aceros Arequipa", "Perú", None, "Mayor siderúrgica del país (barras, perfiles) (CORAREC1/CORAREI1)."),
    ("siderperu", "Siderperú", "Industria y maquinaria", "Gerdau", "Brasil", None, "Siderúrgica de Chimbote controlada por Gerdau (SIDERC1)."),
    # --- Pesca ---
    ("austral-group", "Austral Group", "Pesca", "Austevoll", "Noruega", None, "Pesquera de harina/aceite y consumo humano; Austevoll (AUSTRAC1)."),
    ("exalmar", "Pesquera Exalmar", "Pesca", "Grupo Matta", "Perú", None, "Pesquera de harina/aceite y CHD; capital peruano (EXALMC1)."),
    # --- Finanzas y banca ---
    ("banco-pichincha", "Banco Pichincha Perú (ex Banco Financiero)", "Finanzas y banca", "Grupo Pichincha", "Ecuador", None, "Banco múltiple del grupo ecuatoriano Pichincha (BPICHC1)."),
    ("alfin-banco", "Alfin Banco (ex Banco Azteca)", "Finanzas y banca", "Grupo Coril", "Perú", None, "Banca de consumo; ex Banco Azteca (ALFINAC1)."),
    ("credinka", "Financiera Credinka", "Finanzas y banca", "Diviso", "Perú", None, "Microfinanzas rurales del grupo Diviso (FCREDIC1)."),
    ("financiera-confianza", "Financiera Confianza", "Finanzas y banca", "BBVA Microfinanzas", "España", None, "Microfinanzas de la Fundación BBVA Microfinanzas (FCONFIC1)."),
    ("proempresa", "Financiera ProEmpresa", "Finanzas y banca", None, "Perú", None, "Microfinanzas de origen ONG (IDESI) (FPROEMC1)."),
    ("caja-los-andes", "Caja Rural Los Andes", "Finanzas y banca", None, "Perú", None, "Caja rural andina con valores inscritos (CRANDEC1)."),
    ("grupo-bvl", "Grupo BVL (Bolsa de Valores de Lima)", "Finanzas y banca", "Grupo BVL", "Perú", None, "Operador de la bolsa; holding (GBVLAC1/GBVLBC1)."),
    ("cavali", "Cavali ICLV", "Finanzas y banca", "Grupo BVL", "Perú", None, "Depositario central de valores (registro y liquidación) (CAVALIC1)."),
    ("infinance-xp", "InFinance XP", "Finanzas y banca", None, "Perú", None, "Entidad financiera no bancaria con valores inscritos (INFIXPC1)."),
    # --- Seguros ---
    ("la-positiva", "La Positiva Seguros", "Seguros", "Grupo La Positiva", "Perú", None, "Aseguradora arequipeña de capital peruano (POSITIC1)."),
    ("mapfre-peru", "Mapfre Perú", "Seguros", "Mapfre", "España", None, "Filial peruana de la aseguradora española Mapfre (MAPFSGC1)."),
    ("vivir-seguros", "Vivir Seguros", "Seguros", None, "Perú", None, "Aseguradora de vida con valores inscritos (VIVSEGC1)."),
    ("qualitas-peru", "Quálitas Seguros Perú", "Seguros", "Quálitas", "México", None, "Filial peruana de la aseguradora mexicana de autos Quálitas (QUALSGC1)."),
    # --- Consumo masivo ---
    ("backus", "Unión de Cervecerías Backus y Johnston", "Consumo masivo", "AB InBev", "Bélgica", None, "Cervecera dominante del país; AB InBev (BACKUSI1/BACKUAC1)."),
    ("cerveceria-san-juan", "Cervecería San Juan", "Consumo masivo", "AB InBev", "Bélgica", None, "Cervecera de la selva (Pucallpa); subsidiaria de Backus (SNJUANC1)."),
    ("laive", "Laive", "Consumo masivo", None, "Perú", None, "Segunda láctea del país (lácteos, embutidos, jugos) (LAIVEBC1)."),
    ("corporacion-lindley", "Corporación Lindley (Coca-Cola · Inca Kola)", "Consumo masivo", "Arca Continental", "México", None, "Embotellador de Coca-Cola e Inca Kola; Arca Continental (CORLINI1)."),
    # --- Agroindustria ---
    ("agro-laredo", "Agroindustrial Laredo", "Agroindustria", "Manuelita", "Colombia", None, "Azucarera de Trujillo del grupo colombiano Manuelita (LAREDOC1)."),
    ("agro-pomalca", "Agroindustrial Pomalca", "Agroindustria", "Grupo Oviedo", "Perú", None, "Azucarera de Lambayeque; grupo Oviedo (POMALCC1)."),
    ("agro-tuman", "Agroindustrial Tumán", "Agroindustria", None, "Perú", None, "Azucarera de Lambayeque con conflictos societarios (TUMANC1)."),
    ("agro-pucala", "Agro Pucalá", "Agroindustria", None, "Perú", None, "Azucarera de Lambayeque (ex Pucalá) (PUCALAC1)."),
    ("agro-paramonga", "Agro Industrial Paramonga (AIPSA)", "Agroindustria", None, "Perú", None, "Azucarera de la costa norte-centro (PARAMOC1)."),
    ("andahuasi", "Azucarera Andahuasi", "Agroindustria", None, "Perú", None, "Azucarera de Huaura (ANDAHUC1)."),
    ("cayalti", "Agrícola Cayaltí", "Agroindustria", None, "Perú", None, "Agroindustrial azucarera de Lambayeque (CAYALTC1)."),
    ("san-jacinto", "Agroindustrias San Jacinto", "Agroindustria", "Grupo Gloria", "Perú", None, "Azucarera de Áncash del grupo Gloria (SNJACIC1)."),
    ("chucarapi", "Central Azucarera Chucarapi", "Agroindustria", None, "Perú", None, "Azucarera de Arequipa (valle de Tambo) (CHUCARC1)."),
    ("agro-el-ingenio", "Azucarera El Ingenio", "Agroindustria", None, "Perú", None, "Azucarera con valores inscritos (INGENIC1)."),
    ("agricola-san-juan", "Empresa Agrícola San Juan", "Agroindustria", None, "Perú", None, "Agroexportadora con valores inscritos (ASJUANC1)."),
    # --- Retail / entretenimiento ---
    # (Cineplanet y Saga ya están en base)
    # --- Inmobiliario ---
    ("inv-centenario", "Inversiones Centenario", "Inmobiliario", "Grupo Wiese", "Perú", 496, "Desarrolladora inmobiliaria del grupo Wiese (INVCENC1)."),
    ("los-portales", "Los Portales", "Inmobiliario", "Grupo Raffo", "Perú", None, "Inmobiliaria, estacionamientos y hotelería (PORTAC1)."),
    ("fibra-prime", "FIBRA Prime", "Inmobiliario", None, "Perú", None, "Primer FIBRA del Perú (renta de bienes raíces) (FIBPRIME)."),
    ("activo-inmob-peruano", "Activo Inmobiliario Peruano", "Inmobiliario", None, "Perú", None, "Vehículo de inversión inmobiliaria (AIPC1)."),
    ("inmobiliaria-sic", "Inmobiliaria SIC", "Inmobiliario", None, "Perú", None, "Inmobiliaria con valores inscritos (ISICC1)."),
    ("futura-inmob", "Futura Consorcio Inmobiliario", "Inmobiliario", None, "Perú", None, "Inmobiliaria (FUTURAC1/FUTURAI1)."),
    # --- Telecomunicaciones ---
    ("integratel", "Integratel Perú", "Telecomunicaciones", None, "Perú", None, "Operador de telecom / infraestructura (INTPEBC1)."),
    # --- Textil ---
    ("creditex", "Creditex", "Textil", "Grupo Romero", "Perú", None, "Textil de algodón pima; grupo Romero (CRETEXC1)."),
    ("universal-textil", "Compañía Universal Textil", "Textil", None, "Perú", None, "Fabricante de tejidos planos (UNITEXC1)."),
    ("textil-piura", "Industria Textil Piura", "Textil", "Grupo Romero", "Perú", None, "Hilados de algodón pima; grupo Romero (PIURAC1)."),
    ("filamentos", "Filamentos Industriales", "Textil", None, "Perú", None, "Fabricante de filamentos/fibras textiles (FILAMEI1)."),
    ("michell", "Michell y Cía.", "Textil", "Grupo Michell", "Perú", None, "Procesador y exportador de fibra de alpaca (Arequipa) (MICHEI1)."),
    # --- Diversos / holdings / medios ---
    ("cervesur", "Corporación Cervesur", "Diversos", "Grupo Cervesur", "Perú", None, "Holding arequipeño diversificado (ex cervecero) (COCESUC1)."),
    ("inverfal", "Inverfal Perú", "Diversos", None, "Perú", None, "Holding de inversiones (INVFALC1)."),
    ("inv-corp-a1", "Inversiones Corporativas A1", "Diversos", None, "Perú", None, "Holding de inversiones (INVCO2C1/INVCORI1)."),
    ("gr-holding", "GR Holding", "Diversos", "Grupo Raffo", "Perú", None, "Holding del grupo Raffo (matriz de Los Portales) (GRHOLDC1)."),
    ("andino-investment", "Andino Investment Holding", "Diversos", None, "Perú", None, "Holding de servicios logísticos y portuarios (AIHC1)."),
    ("peru-holding-turismo", "Perú Holding de Turismo", "Diversos", None, "Perú", None, "Holding de hotelería y turismo (PHTBC1)."),
    ("invertur", "Inversiones en Turismo (Invertur)", "Diversos", None, "Perú", None, "Holding de turismo/hotelería (INVERTC1)."),
    ("el-comercio", "Empresa Editora El Comercio", "Diversos", "Grupo El Comercio", "Perú", None, "Mayor grupo de medios del país (diario El Comercio) (ELCOMEI1)."),
    ("tradi", "Tradi", "Diversos", None, "Perú", None, "Comercializadora de fierros y aceros de construcción (TRADIC1)."),
    ("hermes", "Hermes Transportes Blindados", "Diversos", None, "Perú", None, "Transporte de valores y gestión de efectivo (HERMESC1)."),
    ("bosques-amazonicos", "Bosques Amazónicos (BAM)", "Diversos", None, "Perú", None, "Reforestación y créditos de carbono en la Amazonía (BAMC1)."),
]


def resolve_group(seed, nombre):
    """Devuelve el id del grupo (existente por alias o nuevo creándolo)."""
    if not nombre:
        return None
    low = nombre.lower()
    for sub, gid in ALIAS.items():
        if sub in low:
            return gid
    if nombre in GRUPOS_NUEVOS:
        gid, pais, control = GRUPOS_NUEVOS[nombre]
        if not any(g["id"] == gid for g in seed["grupos"]):
            seed["grupos"].append({
                "id": gid, "nombre": nombre, "control": control, "pais": pais,
                "nota": f"Grupo controlador de emisores BVL.", "fuente": F,
            })
        return gid
    return None


def main():
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    existing = {e["id"] for e in seed["empresas"]}
    fin = seed.setdefault("finanzas", {})
    added = 0
    for eid, nombre, sector, grupo_nombre, pais, mcap, nota in EMPRESAS:
        if eid in existing:
            continue
        gid = resolve_group(seed, grupo_nombre)
        seed["empresas"].append({
            "id": eid, "nombre": nombre, "grupo": gid, "sector": sector,
            "tipo": "empresa", "bvl": True, "ingresos_aprox": None,
            "empleados_aprox": None, "nota": nota, "fuente": F,
            "pais": pais if pais != "Perú" else None,
        })
        if mcap is not None:
            fin[eid] = {"ebitda": None, "utilidad": None, "activos": None,
                        "patrimonio": None, "market_cap": mcap}
        # arista de control grupo -> empresa (para conectar en el grafo)
        if gid:
            seed["propiedad"].append({"de": gid, "a": eid, "pct": None,
                                      "tipo": "control", "fuente": F})
        existing.add(eid)
        added += 1

    seed["meta"]["version"] = "0.3.0"
    SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ {added} empresas BVL nuevas · {len(seed['empresas'])} empresas totales · "
          f"{len(seed['grupos'])} grupos")


if __name__ == "__main__":
    main()
