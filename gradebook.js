var GradebookUtils = {
  getRandomColor: function() {
    var getRandom256 = function(min, max) {
      var initialValue = parseInt(Math.random() * (max - min) + min);
      // wash out with white to create a pastel
      return parseInt((initialValue + 255) / 2);
    };

    var red = getRandom256(180, 250);
    var green = getRandom256(180, 250);
    var blue = getRandom256(180, 250);

    return "rgb("+red+","+green+","+blue+")";
  }
};

$(function() {
  var $spreadsheet = $(".gradebook-table");

  jQuery.expr[":"].Contains = jQuery.expr[":"].contains = jQuery.expr.createPseudo(function(arg) {
      return function( elem ) {
          return jQuery(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
      };
  });


  var initAddGradePopup = function() {
    $("#addGradeItem").qtip({
        id: "addGradeItemPopup",
        content: {
          text: $("#templateGradebookAddForm").html(),
          button: true
        },
        position: {
          my: 'center',
          at: '200px center',
          target: $(document.body)
        },
        style: {
          width: "540px"
        },
        show: {
          event: 'click',
          modal: {
              on: true,
              blur: false,
              escape: false
          },
        },
        hide: {
            fixed: true,
            event: false,
            leave: false
        },
        events: {
          show: function(event, api) {
            $("#createGradeItem").on("click", function() {
              $("#addGradeItem").qtip("hide");
              var matches = $(".hide-me").removeClass("hide-me");
              setTimeout(function() {
                matches.find(".gradebook-item-cell:first").focus();
              }, 500);
            });
            $("#cancelCreateGradeItem").on("click", function() {
              $("#addGradeItem").qtip("hide");
            });
          }
        }
    });
  };


  initAddGradePopup();
  new GradebookSpreadsheet($spreadsheet);
});
