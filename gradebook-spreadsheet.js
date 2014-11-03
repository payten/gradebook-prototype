function GradebookSpreadsheet($spreadsheet) {
  this._CELLS = {};
  this._COLORS = {};
  this.$spreadsheet = $spreadsheet;
  this.$gradeitemColumnContainer = $(".gradebook-gradeitem-columns", $spreadsheet);  

  // bump out HTML5 input attributes
  $(":input[type=number]").attr("type", "text");

  this.initCells();
  this.initStudentFilter();
  this.initSectionFilter();
  this.initCategories();
  this.initFixedTableHeader();
  this.initGradeItemToggle();
  this.initContextSensitiveMenus();
  this.initStudentColumnSorting();

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

  return true;
};


GradebookSpreadsheet.prototype.handleInputReturn = function(event, $cell) {
  this.navigate(event, $cell, "down", true);
};


GradebookSpreadsheet.prototype.handleArrayKey = function(event, $cell) {
  if (event.keyCode == 37) {
    this.navigate(event, $cell, "left", true);
  } else if (event.keyCode == 38) {
    this.navigate(event, $cell, "up", true);
  } else if (event.keyCode == 39) {
    this.navigate(event, $cell, "right", true);
  } else if (event.keyCode == 40) {
    this.navigate(event, $cell, "down", true);
  }
  return false;
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
      fromCell.focus();
      return true;
    }
  } else if (direction == "right") {
    event.preventDefault();
    event.stopPropagation();

    if ($column.index() < $column.siblings().last().index()) {
      $targetCell = aCell.getColumn().nextAll(":visible:first").
                                      find(".gradebook-cell:nth-child("+($cell.index()+1)+")").
                                      focus();
    } else {
      fromCell.focus();
      return true;
    }
  } else if (direction == "up") {
    if ($cell.index() > 0) {
      event.preventDefault();
      event.stopPropagation();

      $targetCell = $cell.prevAll(":visible:first").focus();
    } else {
      fromCell.focus();
    }
  } else if (direction == "down") {
    if ($cell.index() < $column.children().last().index()) {
      event.preventDefault();
      event.stopPropagation();

      $targetCell = $cell.nextAll(":visible:first").focus();
    } else {
      fromCell.focus();
    }
  }

  if (enableEditMode && $targetCell) {
    this.getCellModel($targetCell).enterEditMode();
  } else if ($targetCell) {
    $targetCell.focus();
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

      self._CELLS[colIndex][cellIndex] = new GradebookItemCell($cell, {
        onInputReturn: $.proxy(self.handleInputReturn, self),
        onInputTab: $.proxy(self.handleInputTab, self),
        onArrowKey: $.proxy(self.handleArrayKey, self)
      });
    });
  });

  self.$gradeitemColumnContainer.find(".gradebook-header-cell").each(function(colIndex, header) {
    $(header).data("colIdx", colIndex);
    $(header).attr("id", colIndex + "-" + "header");
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
      self._COLORS[lastCategory] = color;
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


GradebookSpreadsheet.prototype.showOnlyThisGradeItem = function($itemFilter) {
  var $input = $itemFilter.find(":input");
  var $label = $itemFilter.find("label");
  $("#gradeItemFilter .gradebook-item-filter :input:checked:not(#"+$input.attr("id")+")").trigger("click");

  if ($input.is(":not(:checked)")) {
    $label.trigger("click");
  }
};


GradebookSpreadsheet.prototype.refreshSummary = function() {
  var $summary = this.$spreadsheet.find(".gradebook-item-summary");
  var $filter = $("#gradeItemFilter");

  $summary.find(".visible").html($filter.find(".gradebook-item-filter-group:not(.hide-me) .gradebook-item-filter :input:checked").length);
  $summary.find(".total").html($filter.find(".gradebook-item-filter-group:not(.hide-me) .gradebook-item-filter :input").length);
};


GradebookSpreadsheet.prototype.initGradeItemToggle = function() {
  var self = this;

  var $filter = $($("#templateGradeItemFilter").html()).hide();
  $(document.body).append($filter);


  $filter.on("click", "#showAllGradeItems", function() {
    $filter.find(".gradebook-item-filter :input:not(:checked)").trigger("click");
  });

  // setup the colors
  $(".gradebook-item-category-filter", $filter).each(function() {
    var $categoryFilter = $(this);
    var myColor = self._COLORS[$categoryFilter.text().trim()];
    $categoryFilter.closest(".gradebook-item-filter-group").
                    find(".gradebook-item-category-filter-signal").
                    css("backgroundColor", myColor).
                    css("borderColor", myColor);
  });

  var updateSignal = function($label, $input) {
    var $categoryGroup = $label.closest(".gradebook-item-filter-group");
    var $categoryFilter = $categoryGroup.find(".gradebook-item-category-filter");
    var myColor = self._COLORS[$categoryFilter.text().trim()];
    var $signal = $label.find(".gradebook-item-category-filter-signal");

    if ($input.is(":checked")) {
      $signal.css("backgroundColor", myColor).
              css("borderColor", myColor);
    } else {
      $signal.css("backgroundColor", "#FFF").
              css("borderColor", myColor);
    }
  };


/*
   // should the top level be a partial?
    var $categoryLabel = $categoryGroup.find(".gradebook-item-category-filter label");
    var checked = $categoryGroup.find(".gradebook-item-filter :input:checked").length;
    var total = $categoryGroup.find(".gradebook-item-filter :input").length
    if (checked == 0) {
      $categoryLabel.removeClass("category-partial-filter");
      
    } else if (checked == total) {
      $categoryLabel.removeClass("category-partial-filter");
    } else {
      $categoryLabel.addClass("category-partial-filter");
*/

  var updateCategoryFilterState = function($itemFilter) {
    var $group = $itemFilter.closest(".gradebook-item-filter-group");
    var $label = $group.find(".gradebook-item-category-filter label");
    var $input = $group.find(".gradebook-item-category-filter input");

    var checkedItemFilters = $group.find(".gradebook-item-filter :input:checked").length;
    var itemFilters = $group.find(".gradebook-item-filter :input").length;

    $label.find(".gradebook-filter-partial-signal").remove();
    if (checkedItemFilters == 0) {
      $input.prop("checked", false);
    } else if (checkedItemFilters == itemFilters) {
      $input.prop("checked", true);
    } else {
      $input.prop("checked", false);
      $label.find(".gradebook-item-category-filter-signal").append($("<span>").addClass("gradebook-filter-partial-signal"));
    }

    updateSignal($label, $input);
  };


  // here's the serious stuff
  var $button = $("#gradebookGradeItemToggle");
  $button.on("click", function() {
    $button.toggleClass("on");

    var scrollEvent;

    if ($button.hasClass("on")) {
      $filter.css("top", Math.ceil($button.offset().top) -1 + $button.outerHeight() + "px");
      $filter.css("right", $(document.body).width() + 1 - Math.ceil($button.offset().left) - $button.outerWidth() + "px");
      $filter.show();

      $("#gradeItemFilter .gradebook-item-category-filter :input").on("change", function() {
        var $input = $(this);
        var $label = $("#gradeItemFilter label[for="+$input.attr("id")+"]");

        // toggle all columns in this category
        if ($input.is(":checked")) {
          // show all
          $input.closest(".gradebook-item-filter-group").find(".gradebook-item-filter :input:not(:checked)").trigger("click");
        } else {
          // hide all
          $input.closest(".gradebook-item-filter-group").find(".gradebook-item-filter :input:checked").trigger("click");
        }

        updateCategoryFilterState($input);
      });
      $("#gradeItemFilter .gradebook-item-filter :input").on("change", function() {
        var $input = $(this);
        var $label = $("#gradeItemFilter label[for="+$input.attr("id")+"]");
        
        // toggle single column
        var $header = $("#"+$input.data("colidx").toString()+"-header");
        if ($input.is(":checked")) {
          // show
          $header.show();
          $(self.$gradeitemColumnContainer.find(".gradebook-column").
            get(parseInt($input.data("colidx")))).show();
        } else {
          //hide
          $header.hide();
          $(self.$gradeitemColumnContainer.find(".gradebook-column").
            get(parseInt($input.data("colidx")))).hide();
        }
        //hide the category group header too if all are hidden
        var matches = $input.closest(".gradebook-item-filter-group").find(".gradebook-item-filter :input:checked").length;
        if (matches > 0) {
          self.$gradeitemColumnContainer.find(".gradebook-category:contains('"+$header.data("category")+"')").
            show().
            width(matches * 120);
        } else {
          self.$gradeitemColumnContainer.find(".gradebook-category:contains('"+$header.data("category")+"')").
            hide();
        }

        updateSignal($label, $input);
        updateCategoryFilterState($input);
        self.refreshSummary();
      });

      scrollEvent = $(document).on("scroll", function() {
        $filter.css({
          right: $(document.body).width() + 1 - Math.ceil($button.offset().left) - $button.outerWidth() + "px",
          top: Math.ceil($button.offset().top) -1 + $button.outerHeight() + "px"
        });
      });

    } else {
      $filter.hide();
      $(document).off("scroll", scrollEvent);
    }
  });

  self.refreshSummary();
};

GradebookSpreadsheet.prototype.toggleStudentNames = function() {
  this.$spreadsheet.find(".gradebook-column-students").toggleClass("hide-student-names");
};

GradebookSpreadsheet.prototype.initContextSensitiveMenus = function() {
  var self = this;
  var menuHTML = $("#templateContextMenuToggle").html();
  $(".gradebook-header-cell, .gradebook-item-cell", self.$spreadsheet).append(menuHTML);

  $(document.body).on("click", ".context-menu-toggle", function(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    var $toggle = $(event.target);
    var $menu;

    var scrollEvent;

    if ($toggle.is(".on")) {
      $menu = $(".context-menu");
      $menu.remove();
      $(document).off("scrol", scrollEvent);
    } else {
      // Hide all other menus
      $(document.body).find(".context-menu-toggle.on").trigger("click");
      
      if ($toggle.closest(".gradebook-column-students-header").length > 0) {
        $menu = $($("#templateStudentColumnContextMenuToggle").html());
      } else if ($toggle.closest(".gradebook-gradeitem-columns-header").length > 0) {
        $menu = $($("#templateGradeItemContextMenuToggle").html());
      } else if ($toggle.closest(".gradebook-item-cell").length > 0) {
        $menu = $($("#templateGradeContextMenuToggle").html());
      } else if ($toggle.closest(".gradebook-item-filter").length > 0) {
        $menu = $($("#templateGradeItemFilterMenu").html());
        $menu.on("click", "#showOnlyThisItem", function() {
          self.showOnlyThisGradeItem($toggle.closest(".gradebook-item-filter"));
        });
      } else {
        $menu = $($("#templateDummyContextMenuToggle").html());
      }
      $(document.body).append($menu);
      $menu.css({
        left: $toggle.offset().left + $toggle.outerWidth() - 3 - $menu.outerWidth() + "px",
        top: $toggle.offset().top + $toggle.outerHeight() - 3 + "px"
      });

      $(document.body).one("click", function(event) {
        $(document.body).find(".context-menu-toggle.on").trigger("click");
      });
      scrollEvent = $(document).on("scroll", function() {
        $menu.css({
          left: $toggle.offset().left + $toggle.outerWidth() - 3 - $menu.outerWidth() + "px",
          top: $toggle.offset().top + $toggle.outerHeight() - 3 + "px"
        });
      });
    }

    $toggle.toggleClass("on");
  });

  $(document.body).on("click", "#toggleStudentNames", function() {
    self.toggleStudentNames()
  });

};

GradebookSpreadsheet.prototype._sort = ["netid", "last-name", "first-name"];
GradebookSpreadsheet.prototype._sortLabels = {
  "netid": "NetId",
  "last-name": "Last Name",
  "first-name": "First Name"
};
GradebookSpreadsheet.prototype.initStudentColumnSorting = function() {
  var self = this;
  self._currentSort = "netid";
  self._currentSortOrder = "asc";

  var $studentColumn = self.$spreadsheet.find(".gradebook-column.gradebook-column-students");
  $studentColumn.addClass("sort-by-"+self._currentSort);

  var setNextSortField = function() {
    
    $studentColumn.removeClass("sort-by-"+self._currentSort);

    var i = GradebookSpreadsheet.prototype._sort.indexOf(self._currentSort);
    if (i < GradebookSpreadsheet.prototype._sort.length - 1) {
      self._currentSort = GradebookSpreadsheet.prototype._sort[i + 1];
    } else {
      self._currentSort = GradebookSpreadsheet.prototype._sort[0];
    }

    $studentColumn.addClass("sort-by-"+self._currentSort);

    // update the heading text
    self.$spreadsheet.find(".gradebook-column-students-header .gradebook-header-label").text("Students by " + self._sortLabels[self._currentSort]);

    // Reorder the Student labels
    self.$spreadsheet.find(".gradebook-cell.gradebook-user-label").each(function(i, cell) {
      var $cell = $(cell);
      if (self._currentSort == "last-name") {
        $(cell).find(".last-name").insertBefore($cell.find(".first-name"));
      } else {
        $cell.find(".first-name").insertBefore($cell.find(".last-name"));        
      }
    });

    return self._currentSort;
  };

  self.$spreadsheet.find(".gradebook-column.gradebook-column-students .gradebook-user-label").each(function() {
    var $cell = $(this);
    var firstName = $cell.find(".first-name").text().trim();
    var lastName = $cell.find(".last-name").text().trim();
    var netid = $cell.find(".netid").text().trim();

    $cell.attr("data-sort-netid", netid);
    $cell.attr("data-sort-last-name", lastName + ", " + firstName);
    $cell.attr("data-sort-first-name", firstName + " " + lastName);

    $cell.attr("id", netid);
    $.each(self.$spreadsheet.find(".gradebook-column"), function() {
      $($(this).children().get($cell.index())).addClass("netid-"+netid);
    });
  });

  var newOrderIds = [];
  var newOrderIndexes = []

  var $sortToggle = self.$spreadsheet.find(".gradebook-column-students-header .gradebook-header-label");
  $sortToggle.on("click", function(event, opts) {
    if (opts == undefined || (opts && !opts.onlyToggleDirection)) {
      setNextSortField();
    }

    var newOrder = [];
    var cells = self.$spreadsheet.find(".gradebook-column.gradebook-column-students .gradebook-user-label").toArray();
    cells = cells.sort(function(a, b) {
      return $(a).data("sort-" + self._currentSort).localeCompare($(b).data("sort-" + self._currentSort));
    });
    $.each(cells, function(i, cell) {
      newOrder.push(cell.id);
    });

    if ($sortToggle.closest(".gradebook-header-cell").hasClass("sort-desc")) {
      newOrder = newOrder.reverse();
    }

    var $columns = self.$spreadsheet.find(".gradebook-column");
    $.each($columns, function(colIndex, column) {
      var $column = $(column);
      $.each(newOrder, function(i, netid) {
        var $cell = $column.find(".netid-"+netid);
        if (i==0) {
          $cell.prependTo($column);
        } else {
          $cell.insertAfter($column.children().get(i-1));
        }
      });
    });
  });

  self.$spreadsheet.find(".gradebook-column-students-header .sort-direction-toggle").on("click", function() {
    $(this).closest(".gradebook-header-cell").toggleClass("sort-asc").toggleClass("sort-desc");
    $sortToggle.triggerHandler("click", {
      onlyToggleDirection: true
    });
  });
};