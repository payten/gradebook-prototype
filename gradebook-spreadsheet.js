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

  this.initGradeItemDetails();

  this.initDragAndDrop();

  this.initCommentNotifications();

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
  $studentFilter.siblings(".clearable-input-x").on("click", function() {
    $studentFilter.val("").trigger("keyup");
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
    if (self.$spreadsheet.hasClass("hide-categories")) {
      self._sortableHeaderList.sortable("enable");
      self._sortableHeaderList.removeClass("disabled");

      $(".gradebook-header-list li").each(function() {
        self._moveColumn($(this), $(this).data("my-index"));
      });
    } else {
      self._sortableHeaderList.sortable("disable");
      self._sortableHeaderList.addClass("disabled");

      // reorder columns so they sit under the categories
      $(".gradebook-header-list li").each(function() {
        $(this).data("my-index", $(this).index());
      });
      var $header = self.$spreadsheet.find(".gradebook-header-list");
      var $columns = $(".gradebook-gradeitem-columns");
      var index = 0;
      $(".gradebook-categories .gradebook-category").each(function(i) {
        var $category = $(this);
        $header.find(".gradebook-header-cell").each(function() {
          var $headerCell = $(this);

          if ($headerCell.data("category") == $category.data("category")) {
            self._moveColumn($headerCell.parent(), index);
            index++;
          }
        });
      });
    }
  });
};

GradebookSpreadsheet.prototype._moveColumn = function($header, index) {
  var $headerList = this.$spreadsheet.find(".gradebook-header-list");
  var $columns = $(".gradebook-gradeitem-columns");
  var $column = $columns.find("#gradeitem-"+$header.data("index")+"-column");

  if (index == 0) {
    $headerList.prepend($header);
    $columns.prepend($column);
  } else {
    $header.insertAfter($headerList.children().get(index - 1));
    $column.insertAfter($columns.children().get(index-1));
  }
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
      var $category = $("<div>").
                        addClass("gradebook-category").
                        text(lastCategory).
                        width($this.width()).
                        data("category", lastCategory);

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

  $fixedHeaderRight.find(".gradebook-item-details").hover(function() {
    $fixedHeaderRight.addClass("show-details");
  }, function() {
    $fixedHeaderRight.removeClass("show-details");
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

  var visible = $filter.find(".gradebook-item-filter-group:not(.hide-me) .gradebook-item-filter :input:checked").length;
  var total = $filter.find(".gradebook-item-filter-group:not(.hide-me) .gradebook-item-filter :input").length

  $summary.find(".visible").html(visible);
  $summary.find(".total").html(total);

  if (visible < total) {
    $summary.addClass("warn-items-hidden");
  } else {
    $summary.removeClass("warn-items-hidden");
  }
};


GradebookSpreadsheet.prototype.initGradeItemToggle = function() {
  var self = this;

  var $filter = $($("#templateGradeItemFilter").html()).hide();
  $(document.body).append($filter);


  $filter.on("click", "#showAllGradeItems", function() {
    $filter.find(".gradebook-item-filter :input:not(:checked)").trigger("click");
  });

  $filter.on("click", "#hideAllGradeItems", function() {
    $filter.find(".gradebook-item-filter :input:checked").trigger("click");
  });

  // setup the colors
  $(".gradebook-item-category-filter", $filter).each(function() {
    var $categoryFilter = $(this);
    var myColor = self._COLORS[$categoryFilter.text().trim().split(" ")[0]];
    $categoryFilter.closest(".gradebook-item-filter-group").
                    find(".gradebook-item-category-filter-signal").
                    css("backgroundColor", myColor).
                    css("borderColor", myColor);
  });

  var updateSignal = function($label, $input) {
    var $categoryGroup = $label.closest(".gradebook-item-filter-group");
    var $categoryFilter = $categoryGroup.find(".gradebook-item-category-filter");
    var myColor = self._COLORS[$categoryFilter.text().trim().split(" ")[0]];
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
          $header.parent().show();
          $(self.$gradeitemColumnContainer.find(".gradebook-column").
            get(parseInt($input.data("colidx")))).show();
        } else {
          //hide
          $header.parent().hide();
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
  $(".gradebook-header-cell, .gradebook-item-cell, .gradebook-course-total", self.$spreadsheet).append(menuHTML);

  $(document.body).on("click", ".context-menu-toggle", function(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    var $toggle = $(event.target);
    var $menu;

    var scrollEvent;

    if ($toggle.is(".on")) {
      $(".context-menu").hide();
      $(document).off("scroll", scrollEvent);
    } else {
      // Hide all other menus
      $(document.body).find(".context-menu-toggle.on").trigger("click");

      if ($toggle.data("menu") == null) {
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
        } else if ($toggle.closest(".gradebook-course-total").length > 0) {
          $menu = $($("#templateGradeTotalMenu").html());
        } else {
          $menu = $($("#templateDummyContextMenuToggle").html());
        }
        $(document.body).append($menu);
        $menu.data("header", $toggle.closest(".gradebook-header-cell"));
        $menu.data("toggle", $toggle);
        $toggle.data("menu", $menu[0]);
      } else {
        $menu = $($toggle.data("menu"));
        $menu.show();
      }

      $menu.css({
        left: $toggle.offset().left + $toggle.outerWidth() - $menu.outerWidth() + "px",
        top: $toggle.offset().top + $toggle.outerHeight() - 1 + "px"
      });

      $(document.body).one("click", function(event) {
        $(document.body).find(".context-menu-toggle.on").trigger("click");
      });
      scrollEvent = $(document).on("scroll", function() {
        $menu.css({
          left: $toggle.offset().left + $toggle.outerWidth() - $menu.outerWidth() + "px",
          top: $toggle.offset().top + $toggle.outerHeight() - 1 + "px"
        });
      });
    }

    $toggle.toggleClass("on").trigger("visible");
  });

  $(document.body).on("click", "#toggleStudentNames", function() {
    $(this).toggleClass("on");
    self.toggleStudentNames();
  });

  $(document.body).on("click", "#toggleVisibleToStudents", function() {
    var $toggle = $(this).toggleClass("on");
    var $header = $toggle.closest(".context-menu").data("header");
    $header.find(".released-to-students").toggleClass("off");
  });

  $(document.body).on("click", "#toggleCalcInclusion", function() {
    var $toggle = $(this).toggleClass("on");
    var $header = $toggle.closest(".context-menu").data("header");
    $header.find(".included-in-grade").toggleClass("off");
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


GradebookSpreadsheet.prototype.initGradeItemDetails = function() {
  this.$spreadsheet.find(".gradebook-gradeitem-columns-header .gradebook-header-cell").
    hover(
      function(event) {
        //$(this).addClass("cloned-and-popped");
        //$cell.css("top", $(this).offset().top).css("left", $(this).offset().left).attr("id", "");
        //$(document.body).append($cell);
        //$cell.on("mouseover", function() {
        //   clearTimeout($cell.data("closeTimeout"));
        //}).on("mouseout", function() {
        //  $cell.data("closeTimeout", setTimeout(function() {
//
          //}, 500));
        //})
      },
      function(event) {
        //$(".cloned-and-popped").remove();
      }
    );
};

GradebookSpreadsheet.prototype.initDragAndDrop = function() {
  var $header = this.$spreadsheet.find(".gradebook-gradeitem-columns-header");
  var $headerList = $("<ul>").addClass("gradebook-header-list");
  var $columns = $(".gradebook-gradeitem-columns");
  
  $header.find(".gradebook-header-cell").each(function(i) {
    var $li = $("<li>").append($(this));
    $li.attr("id", "gradeitem-"+i + "-header");
    $li.data("index", i);
    if ($(this).hasClass("hide-me")) {
      $li.addClass("hide-me");
    }
    $($columns.find(".gradebook-column").get(i)).attr("id", "gradeitem-"+i+"-column");
    $headerList.append($li);
  });
  $header.append($headerList);
  this._sortableHeaderList = $headerList;
  $headerList.sortable({
    handle: '.gradebook-item-title'
  });
  $headerList.on("dragstart", function() {
    $(".gradebook-gradeitem-columns").addClass("reordering");
    $headerList.find("li").each(function() {
      $(this).attr("id", "");
    });
  }).on("dragstop", function() {
    $(".gradebook-gradeitem-columns").removeClass("reordering");    
  }).on("sortupdate", function(event, sortdata) {
      $headerList.find("li").each(function(i, li) {
        var $li = $(li);
        var $column = $columns.find("#gradeitem-"+$li.data("index")+"-column");
        if ($li.data("index") != i) {
          if (i == 0) {
            $columns.prepend($column);
          } else {
            $column.insertAfter($columns.find(".gradebook-column").get(i - 1));
          }          
        }
      });
    });
};


GradebookSpreadsheet.prototype.initCommentNotifications = function() {
  var $commentNotification = $("<span>").addClass("comment-notification");

  for (var i = 0; i < 20; i++) {
    var columnIndex = Math.floor(Math.random() * 8);
    var rowIndex = Math.floor(Math.random() * 60);

    $("#"+columnIndex+"-"+rowIndex).prepend($commentNotification.clone());
  }
};