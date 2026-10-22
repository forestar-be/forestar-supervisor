// jsdom n'implémente pas l'API Web Animations. La zone de défilement de
// @base-ui l'appelle après un délai : sans ce bouchon, l'erreur tombe hors du
// test et fait échouer la suite alors que tous les tests passent.
if (typeof Element !== 'undefined' && !Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => [];
}
