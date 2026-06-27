(function () {
  var config = window.KEI22_BOTFAQTOR || {};
  var scriptSrc = config.scriptSrc || '';

  if (!scriptSrc) {
    return;
  }

  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = scriptSrc;
  document.head.appendChild(script);
})();
