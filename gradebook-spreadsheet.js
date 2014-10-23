function GradebookSpreadsheet($spreadsheet) {
  this._CELLS = {};
  this.$spreadsheet = $spreadsheet;
  this.$gradeitemColumnContainer = $(".gradebook-gradeitem-columns", $spreadsheet);  

  this.initCells();
  this.initStudentFilter();
  this.initSectionFilter();
  this.initCategories();
  this.initFixedTableHeader();

  this.addListeners();
}

GradebookSpreadsheet.prototype.onKeydown = function(event) {
  var $eventTarget = $(event.target);
  if ($eventTarget.is(".gradebook-item-cell")) {
    // arrow left 37 || tab 9 + SHIFT
    if (event.keyCode == 37 || (event.shiftKey && event.keyCode == 9)) {
      this.navigate(event, event.target, "left");

    // arrow up 38
    } else if (event.keyCode == 38) {
      this.navigate(event, event.target, "up");

    // arrow right 39 || tab 9
    } else if (event.keyCode == 39 || event.keyCode == 9) {
      this.navigate(event, event.target, "right");

    // arrow down 40
    } else if (event.keyCode == 40) {
      this.navigate(event, event.target, "down");

    // return 13
    } else if (event.keyCode == 13) {
      this.getCellModel($eventTarget).enterEditMode();

    // 0-9 48-57
    } else if (event.keyCode >= 48 && event.keyCode <= 57) {
      event.preventDefault();
      this.getCellModel($eventTarget).enterEditMode(event.keyCode - 48);

    // DEL 8
    } else if (event.keyCode == 8) {
      event.preventDefault();
      this.getCellModel($eventTarget).clear();
    }
  }
};


GradebookSpreadsheet.prototype.onClick = function(event) {
  var $eventTarget = $(event.target);

  var $cell = $eventTarget.hasClass("gradebook-item-cell") ? $eventTarget : $eventTarget.closest(".gradebook-item-cell");

  if ($cell.length > 0 && $cell.hasClass("gradebook-cell-ready") && !$cell.hasClass("gradebook-cell-active")) {
    this.getCellModel($cell).enterEditMode();
  }
};


GradebookSpreadsheet.prototype.handleInputReturn = function(event, $cell) {
  this.navigate(event, $cell, "down", true);
};


GradebookSpreadsheet.prototype.handleInputTab = function(event, $cell) {
  this.navigate(event, $cell, event.shiftKey ? "left" : "right", true);
};


GradebookSpreadsheet.prototype.getCellModel = function($cell) {
  return this._CELLS[$cell.data("colIdx")][$cell.data("cellIdx")];
};


GradebookSpreadsheet.prototype.navigate = function(event, fromCell, direction, enableEditMode) {
  var $cell = $(fromCell);
  var aCell = this.getCellModel($cell);

  var $column = aCell.getColumn();
  var $columnGroup = aCell.getColumn().closest(".gradebook-column-group");

  var $targetCell;

  if (direction == "left") {
    if ($column.index() > 1) {
      event.preventDefault();
      event.stopPropagation();

      $targetCell = aCell.getColumn().prevAll(":visible:first").
                      find(".gradebook-cell:nth-child("+($cell.index()+1)+")").
                      focus();
    } else {
      return true;
    }
  } else if (direction == "right") {
    event.preventDefault();
    event.stopPropagation();

    if ($column.index() < $column.siblings().last().index()) {
      $targetCell = aCell.getColumn().next().
                                      find(".gradebook-cell:nth-child("+($cell.index()+1)+")").
                                      focus();
    } else {
      return true;
    }
  } else if (direction == "up") {
    if ($cell.index() > 0) {
      event.preventDefault();
      event.stopPropagation();

      $targetCell = $cell.prevAll(":visible:first").focus();
    }
  } else if (direction == "down") {
    if ($cell.index() < $column.children().last().index()) {
      event.preventDefault();
      event.stopPropagation();

      $targetCell = $cell.nextAll(":visible:first").focus();
    }
  }

  if (enableEditMode && $targetCell) {
    this.getCellModel($targetCell).enterEditMode();
  }

  return false;
};


GradebookSpreadsheet.prototype.initCells = function() {
  var self = this;
  self.$gradeitemColumnContainer.find(".gradebook-column").each(function(colIndex) {
    var $column = $(this);
    $column.data("colIdx", colIndex);

    self._CELLS[colIndex] = {};

    $column.find(".gradebook-item-cell").each(function(cellIndex) {
      var $cell = $(this);
      $cell.data("colIdx", colIndex).data("cellIdx", cellIndex);
      $cell.attr("id", colIndex + "-" + cellIndex);

      var callbacks = $.Callbacks();
      callbacks.add(self.handleInputReturn);
      callbacks.add(self.handleInputTab);
      

      self._CELLS[colIndex][cellIndex] = new GradebookItemCell($cell, {
        onInputReturn: $.proxy(self.handleInputReturn, self),
        onInputTab: $.proxy(self.handleInputTab, self)
      });
    });
  });
};


GradebookSpreadsheet.prototype.addListeners = function() {
  var self = this;
  self.$spreadsheet.on("keydown", function(event) {
    self.onKeydown(event);
  }).on("click", function(event) {
    self.onClick(event);
  });
};


GradebookSpreadsheet.prototype._applyStudentFilter = function(query) {
  var self = this;

  var $studentColumn = $(".gradebook-column.gradebook-column-students", self.$spreadsheet);
  self.$spreadsheet.find(".filtered-by-studentFilter").removeClass("filtered-by-studentFilter");

  if (query != "") {
    $studentColumn.find(".gradebook-cell.gradebook-user-label:not(:contains('"+query+"'))").each(function() {
      var index = $(this).index();
      self.$spreadsheet.find(".gradebook-column").each(function() {
        $($(".gradebook-cell", this).get(index)).addClass("filtered-by-studentFilter");
      });
    });
  }
};

GradebookSpreadsheet.prototype.initStudentFilter = function() {
  var self = this;
  var $studentFilter = $("#studentFilter");
  $studentFilter.on("keyup", function() {
    self._applyStudentFilter($studentFilter.val());
  });
};


GradebookSpreadsheet.prototype._applySectionFilter = function(section) {
  var self = this;
  self.$spreadsheet.find(".filtered-by-sectionFilter").removeClass("filtered-by-sectionFilter");
  if (section != "") {
    var $sectionColumn = $(".gradebook-column.gradebook-column-sections");
    $sectionColumn.find(".gradebook-cell:not(:contains('" + section + "'))").each(function() {
      var index = $(this).index();
      self.$spreadsheet.find(".gradebook-column").each(function() {
        $($(".gradebook-cell", this).get(index)).addClass("filtered-by-sectionFilter");
      });
    });
  }
};

GradebookSpreadsheet.prototype.initSectionFilter = function() {
  var self = this;
  var $sectionFilter = $("#sectionFilter", self.$spreadsheet);
  $sectionFilter.on("change", function() {
    self._applySectionFilter($sectionFilter.val());
  });
};


GradebookSpreadsheet.prototype.initCategories = function() {
  var self = this;
  // hide by default
  self.$spreadsheet.addClass("hide-categories");
  $("#gradebookCategoryToggle").on("change", function() {
    self.$spreadsheet.toggleClass("hide-categories")
  });
};


GradebookSpreadsheet.prototype.initFixedTableHeader = function() {
  var self = this;

  var $fixedHeaderLeft = $("<div>").
                              addClass("gradebook-fixed-header").
                              addClass("gradebook-fixed-columns-header");
  self.$spreadsheet.find(".gradebook-fixed-columns .gradebook-column .gradebook-header-cell").each(function() {
    var $this = $(this);
    $this.width($this.parent().width());
    $fixedHeaderLeft.append(this);
  });

  self.$spreadsheet.find(".gradebook-fixed-columns").prepend($fixedHeaderLeft);

  var $fixedHeaderRight = $("<div>").
                              addClass("gradebook-fixed-header").
                              addClass("gradebook-gradeitem-columns-header");
  var $categories = $("<div>").addClass("gradebook-categories");

  var lastCategory;
  self.$spreadsheet.find(".gradebook-gradeitem-columns .gradebook-column .gradebook-header-cell").each(function() {
    var $this = $(this);
    $this.width($this.parent().width());
    $fixedHeaderRight.append(this);

    if ($this.data("category") == lastCategory) {
      var $category = $categories.children().last();
      $category.width($category.width() + $this.width());
      $this.css("backgroundColor", $category.css("backgroundColor"));
    } else {
      lastCategory = $this.data("category");
      var $category = $("<div>").addClass("gradebook-category").text(lastCategory).width($this.width());

      $category.append($("<div>").addClass("gradebook-category-weighting").text($this.data("weighting")));

      if ($this.hasClass("hide-me")) {
        $category.addClass("hide-me");
      }

      var color = GradebookUtils.getRandomColor();
      $category.css("backgroundColor", color);
      $this.css("backgroundColor", color);
      $categories.append($category);
    }
  });

  $fixedHeaderRight.prepend($categories);

  self.$spreadsheet.find(".gradebook-gradeitem-columns").prepend($fixedHeaderRight);

  var $toolbar = $("#gradebookToolbar");
  $(document).on("scroll", function() {
    if (self.$spreadsheet.position().top < document.body.scrollTop) {
      $fixedHeaderLeft.css("top", document.body.scrollTop - self.$spreadsheet.position().top + $toolbar.outerHeight() + "px");
      $fixedHeaderRight.css("top", document.body.scrollTop - self.$spreadsheet.position().top + $toolbar.outerHeight() + "px");
      $toolbar.css("top", document.body.scrollTop + "px");
    } else {
      $toolbar.css("top", "");
      $fixedHeaderLeft.css("top", $toolbar.outerHeight());
      $fixedHeaderRight.css("top", $toolbar.outerHeight());
    }
  });
};