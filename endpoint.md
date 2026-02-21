# Camera Doc Assistant API — Endpoints

Fuente: https://camera-50.vercel.app/docs (OAS 3.1) — OpenAPI: https://camera-50.vercel.app/openapi.json

## Base URL

- Producción: `https://camera-50.vercel.app`
- Todas las rutas empiezan con: `/api/v1`

## Autenticación

- No se documenta autenticación (no hay `securitySchemes` en OpenAPI). Se asume **sin auth**.

## Endpoints

### 1) POST `/api/v1/medications/search` — Buscar medicamentos (JSON)

Busca medicamentos usando **texto** o **imagen** (Base64 o URL).

**Content-Type**: `application/json`

#### Request body (SearchRequest)

Campos (todos opcionales, pero se requiere que exista al menos `text` o `image`):

- `text`: `string | null`
  - Descripción: nombre del medicamento para búsqueda directa.
  - Ejemplo: `"Paracetamol 500mg"`
- `image`: `string | null`
  - Descripción: imagen de receta médica como **Base64** o **URL pública**.
  - Ejemplo: `"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAA..."`
- `user_lat`: `number | null` (opcional)
  - Descripción: latitud del usuario para farmacias cercanas.
  - Ejemplo: `-16.44886`
- `user_lng`: `number | null` (opcional)
  - Descripción: longitud del usuario para farmacias cercanas.
  - Ejemplo: `-71.55902`

#### Formatos aceptados para `image` (según descripción del endpoint)

- URL pública: `https://example.com/receta.jpg`
- Base64 con prefijo: `data:image/jpeg;base64,....` (o `data:image/png;base64,...`)
- Base64 “puro”: `....` (sin prefijo)

#### Reglas de comportamiento importantes (según la documentación)

- Si envías `text` **e** `image` a la vez: **la imagen tiene prioridad** y el texto se ignora.
- Si no envías ni `text` ni `image`: devuelve **400** con el mensaje `"Debe proporcionar texto o una imagen."`.
- Si el GPS viene incompleto (`user_lat` sin `user_lng` o viceversa): se ignoran ambas coordenadas.

#### Ejemplos

**A) Búsqueda por texto**

```bash
curl -X POST "https://camera-50.vercel.app/api/v1/medications/search" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Paracetamol 500mg\"}"
```

**B) Búsqueda por imagen en Base64 + GPS**

```bash
curl -X POST "https://camera-50.vercel.app/api/v1/medications/search" \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"data:image/jpeg;base64,/9j/...\",\"user_lat\":-16.44886,\"user_lng\":-71.55902}"
```

#### Response 200 (SearchResponse)

```json
{
  "results": [
    {
      "medicamento": {
        "nom_prod": "...",
        "nom_ifa": "...",
        "concentracion": "...",
        "forma_farmaceutica": "...",
        "macro_categoria": "...",
        "texto_exacto_busqueda": "..."
      },
      "descripcion": {
        "clase_terapeutica": {"titulo": "...", "descripcion_sencilla": "..."},
        "para_que_sirve": "...",
        "instrucciones_de_uso": ["..."],
        "cuidados_durante_tratamiento": ["..."],
        "advertencia_si_pasa_esto": "...",
        "contraindicaciones": ["..."],
        "gestion_de_olvidos": "...",
        "como_guardarlo": "..."
      },
      "ubicaciones_recomendadas": {
        "mas_barata": {
          "tipo_recomendacion": "mas_barata",
          "farmacia": {
            "establecimiento": "...",
            "precio": 0,
            "tipo": "Privado",
            "titular": "...",
            "fabricante": "...",
            "departamento": "...",
            "provincia": "...",
            "distrito": "...",
            "direccion": "...",
            "telefono": "...",
            "url_maps": "...",
            "latitud": null,
            "longitud": null
          },
          "distancia_km": null,
          "puntaje_equilibrio": null
        },
        "mas_cercana": null,
        "mas_equilibrada": null,
        "total_disponibles": 0
      }
    }
  ],
  "feedback_message": "Receta clara."
}
```

Notas:

- `descripcion` puede ser `null` si aún no fue generada (está “en cola de procesamiento”).
- `ubicaciones_recomendadas` puede ser `null` si no hay farmacias registradas para ese medicamento.
- `feedback_message` (string o null) se usa para explicar casos como:
  - `"Imagen ilegible o borrosa"`
  - `"No se identificaron medicamentos en la imagen"`
  - `"Receta clara."`

#### Errores

- `422 Validation Error` (FastAPI / Pydantic): estructura inválida.
- `400 Bad Request`: cuando falta `text` y `image` (según docs).

---

### 2) POST `/api/v1/medications/search/upload` — Buscar medicamentos (multipart/form-data)

Busca medicamentos subiendo una imagen directamente (archivo). Útil para web/desktop o clientes que soporten “pegar desde portapapeles”.

**Content-Type**: `multipart/form-data`

#### Form data (Body_search_medication_upload_api_v1_medications_search_upload_post)

- `image` (requerido): `binary`
  - Descripción (OpenAPI): "Imagen de la receta médica (JPG, PNG, WEBP)".
  - La descripción del endpoint lista también `image/gif` como soportado.
- `user_lat` (opcional): `number | null`
- `user_lng` (opcional): `number | null`

#### Ejemplo

```bash
curl -X POST "https://camera-50.vercel.app/api/v1/medications/search/upload" \
  -F "image=@C:\\ruta\\receta.jpg" \
  -F "user_lat=-16.44886" \
  -F "user_lng=-71.55902"
```

#### Response 200

- Misma estructura que `SearchResponse` (ver endpoint anterior).

#### Errores

- `422 Validation Error` si falta `image` o el form data no cumple el esquema.

---

## Lógica de recomendaciones de farmacias (ubicaciones_recomendadas)

La respuesta puede incluir un objeto `ubicaciones_recomendadas` con:

- `mas_barata`: recomendación por mejor precio (si hay farmacias disponibles)
- `mas_cercana`: recomendación por menor distancia (requiere GPS)
- `mas_equilibrada`: balance precio + distancia (requiere GPS)
- `total_disponibles`: entero (default `0`)

Reglas documentadas:

- Sin `user_lat` y `user_lng`:
  - `mas_barata` puede venir (si hay datos en BD)
  - `mas_cercana` y `mas_equilibrada` serán `null`
  - `distancia_km` será `null`
- Si `total_disponibles` es `0`: no hay stock registrado.
- `mas_equilibrada` usa un cálculo con Haversine + score normalizado; un puntaje menor indica mejor equilibrio. `puntaje_equilibrio` es referencial.

## Modelos (schemas) principales (según OpenAPI)

- `SearchRequest`
- `SearchResponse`
- `MedicationResponse`
- `MedicamentoDB`
- `DescripcionMedica`
- `UbicacionesRecomendadas`
- `UbicacionRecomendacion`
- `UbicacionDetalle`
- `HTTPValidationError` / `ValidationError`
