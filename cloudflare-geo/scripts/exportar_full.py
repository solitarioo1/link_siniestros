import geopandas as gpd

ENTRADA = "../../APP FOTO/assets/geodata/geodata.gpkg"

def exportar(layer, columnas, salida):
    gdf = gpd.read_file(ENTRADA, layer=layer)
    gdf.columns = [c.lower() for c in gdf.columns]
    gdf = gdf[[c.lower() for c in columnas] + ["geometry"]]
    gdf.to_file(f"data/{salida}", driver="GeoJSON")
    print(salida, len(gdf))

exportar("distrito", ["nombdep", "nombprov", "nombdist"], "distrito_full.geojson")
exportar("sector_estadistico", ["nom_se"], "sector_estadistico_full.geojson")
