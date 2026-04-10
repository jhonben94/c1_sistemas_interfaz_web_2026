export const environment = {
  production: true,
  /** Sitio estático: el menú se carga desde `tree.json` en el mismo despliegue. */
  githubPages: true,
  /**
   * Vacío: respuesta demo en el navegador (sin OpenAI), como el servidor sin `OPENAI_API_KEY`.
   * Si despliegas el API en otro origen, pon la URL base sin barra final; debe permitir CORS desde GitHub Pages.
   */
  apiUrl: ''
};
