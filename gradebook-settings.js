function GradebookSettings($container) {
  this.$containter = $container;

  this.initToggleContent();
};

GradebookSettings.prototype.initToggleContent = function() {
  this.$containter.find(".content-toggle").on("click", function() {
    var $toggle = $(this);
    $toggle.toggleClass("on");
    $toggle.siblings(".togglable-content").toggle();
  });
};

$(function() {
  new GradebookSettings($(".portletBody"));
});