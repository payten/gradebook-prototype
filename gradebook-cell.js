function GradebookItemCell($cell, callbacks) {
  this.$cell = $cell;
  this.callbacks = callbacks;
  this.$spreadsheet = this.$cell.closest(".gradebook-table");
  this.$input = this.$cell.find(":input");

  // setup tabbing
  this.$cell.attr("tabindex", "0");
  this.$input.attr("tabindex", "-1").attr("disabled","disabled");

  // store the original value
  this.$input.data("orig-value", this.$input.val());

  this.addListeners();
};


GradebookItemCell.prototype.getColumn = function() {
  return this.$cell.closest(".gradebook-column");
};


GradebookItemCell.prototype.getWrapper = function() {
  return this.$cell.closest(".gradebook-wrapper");
};


GradebookItemCell.prototype.getHeaderToolbar = function() {
  return $(".gradebook-gradeitem-columns-header", this.$spreadsheet);
};


GradebookItemCell.prototype.getHeaderCell = function() {
  return $(this.getHeaderToolbar().find(".gradebook-header-cell").get(this.getColumn().index() - 1));
};


GradebookItemCell.prototype.getCellsInRow = function() {
  return $(".gradebook-column .gradebook-cell:nth-child("+(this.$cell.index()+1)+")", this.$spreadsheet);
};


GradebookItemCell.prototype.onFocus = function(event) {
  var $column = this.getColumn(), 
      $wrapper = this.getWrapper(),
      $header = this.getHeaderToolbar();

  var self = this;

  // highlight the column
  $column.addClass("gradebook-column-highlight");

  // highlight the cell and mark as ready for edit
  self.$cell.addClass("gradebook-cell-highlight");
  setTimeout(function() {
    self.$cell.addClass("gradebook-cell-ready");
  }, 200); // add 200ms so it will catch double click to edit..

  // highlight the header cell
  self.getHeaderCell().addClass("gradebook-cell-highlight");

  // highlight the row
  self.getCellsInRow().addClass("gradebook-cell-highlight");

  // check input is visible on x-scroll
  if  ($column[0].offsetLeft - $wrapper[0].scrollLeft < 110) {
     $wrapper[0].scrollLeft = $column[0].offsetLeft;
  }

  // check input is visible on y-scroll
  var headerBottomPosition = $header[0].offsetTop + $header[0].offsetHeight;
  if (self.$cell[0].offsetTop < headerBottomPosition) {
    document.body.scrollTop = document.body.scrollTop - (headerBottomPosition - self.$cell[0].offsetTop);
  }
};


GradebookItemCell.prototype.onBlur = function(event) {
  // if blur is from cell to input, then don't worry about it
  if (event.originalEvent && $(event.originalEvent.relatedTarget).parent()[0] == this.$cell[0]) {
    return;
  }
  this.getColumn().removeClass("gradebook-column-highlight");
  this.$cell.removeClass("gradebook-cell-highlight").
             removeClass("gradebook-cell-active").
             removeClass("gradebook-cell-ready");

  this.getHeaderCell().removeClass("gradebook-cell-highlight");
  this.getCellsInRow().removeClass("gradebook-cell-highlight");
};


GradebookItemCell.prototype.enterEditMode = function(withValue) {
  var self = this;

  // Cannot edit while saving
  if (self.$cell.hasClass("gradebook-cell-item-saving")) {
    return;
  }

  self.$cell.addClass("gradebook-cell-active");
  //self.$input.data("orig-value", self.$input.val());

  if (withValue != null) {
    this.$input.val(withValue);
  }

  self.$input.removeAttr("disabled").removeAttr("tabindex").focus();

  // if not typing a value then select the input
  if (withValue == null) {
    self.$input.focus().select();
  } else {
    self.$input.focus();
  }

  self.$input.one("blur", function(event) {
    self.exitEditMode();
    self.save();
  });
  self.$input.on("keydown", function(event) {
    // return 13
    if (event.keyCode == 13) {
      event.preventDefault();
      event.stopPropagation();

      self.exitEditMode();
      self.callbacks.onInputReturn(event, self.$cell);
      self.save();

      return false;

    // ESC 27
    } else if (event.keyCode == 27) {
      event.preventDefault();
      event.stopPropagation();

      self.undo();

      self.exitEditMode();
      self.$cell.focus();

      return false;

    // arrow keys
    } else if (event.keyCode >= 37 && event.keyCode <= 40) {
      event.preventDefault();
      event.stopPropagation();

      self.exitEditMode();
      self.callbacks.onArrowKey(event, self.$cell);
      self.save();

      return false;

    // TAB 9
    } else if (event.keyCode == 9) {
      event.preventDefault();
      event.stopPropagation();

      self.exitEditMode();
      self.$cell.focus();
      self.callbacks.onInputTab(event, self.$cell);
      self.save();
      
      return false;
    }
  });
};


GradebookItemCell.prototype.exitEditMode = function() {
  this.$input.data("valid", this.$input[0].validity.valid);
  this.$input.attr("disabled","disabled").attr("tabindex", "-1");
  this.$cell.removeClass("gradebook-cell-active");
  this.$input.off("keyup");
  this.$cell.triggerHandler("blur");
};


GradebookItemCell.prototype.undo = function() {
  this.$cell.removeClass("gradebook-cell-item-error");
  this.$input.val(this.$input.data("orig-value"));
};


GradebookItemCell.prototype.clear = function() {
  this.$input.val("");
  this.$input.data("valid", true);
  this.save();
};


GradebookItemCell.prototype._validate = function() {
  // basic validate of value, NaN, within range etc.
  var value = this.$input.val();

  if (value == "" && !(this.$input.data("valid") == true)) {
    return false;
  }

  if (value == "") {
    return true;
  }

  // basic "am I a string" test
  if (parseFloat(value) + "" != value) {
    return false;
  }

  if (parseFloat(value) > parseInt(this.$input.attr("max"))) {
    return false;
  } else if (parseFloat(value) < parseInt(this.$input.attr("min"))) {
    return false;
  }

  return true;
};


GradebookItemCell.prototype.save = function() {
  var self = this;
  
  if (self.$input.val() == self.$input.data("orig-value")) {
    return;
  };
  
  self.$cell.removeClass("gradebook-cell-item-error").addClass("gradebook-cell-item-saving");
  setTimeout(function() {
    self.$cell.removeClass("gradebook-cell-item-saving");
    if (self._validate()) {
      self.$cell.addClass("gradebook-cell-item-saved");
      self.$input.data("orig-value", self.$input.val());
      setTimeout(function() {
        self.$cell.removeClass("gradebook-cell-item-saved");
      }, 3000);
    } else {
      self.$cell.addClass("gradebook-cell-item-error");
    }

  }, 2000);

};


GradebookItemCell.prototype.addListeners = function() {
  var self = this;
  self.$cell.on("focus", function(event) {
    self.onFocus(event);
  }).on("blur", function(event) {
    self.onBlur(event);
  });
};