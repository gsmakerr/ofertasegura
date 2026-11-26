// Repassa cada pedido ao site (Worker "ofertasegura"), sem mudar nada.
export default {
  fetch: (request, env) => env.SITE.fetch(request),
};
