var defaultUrl =
  localStorageGetItem("api-url") || "yoururl";
var apiUrl = defaultUrl;
var wait = false;
var check_timeout = 200;

// var editorMode = localStorageGetItem("editorMode") || "normal";
var editorMode = "normal";
var redirectStderrToStdout = false;
var editorModeObject = null;

var font_Size = 16;

var MonacoVim;
var MonacoEmacs;

var layout;

var sourceEditor;
var expectOutputEditor;
var stdinEditor;
var stdoutEditor;
var stderrEditor;
var compileOutputEditor;
var sandboxMessageEditor;
var consoleOutputEditor;

var isEditorDirty = false;
var currentLanguageId;

var $selectLanguage;
var $compilerOptions;
var $o2switch;
var $commandLineArguments;
var $insertTemplateBtn;
var $runBtn;
var $navigationMessage;
var $updates;
var $statusLine;
var $serverstat;
var $savedmessage;
var timeStart;
var timeEnd;

var messagesData;

var layoutConfig = {
  settings: {
    showPopoutIcon: false,
    reorderEnabled: true,
  },
  dimensions: {
    borderWidth: 3,
    headerHeight: 22,
  },
  content: [
    {
      type: "row",
      content: [
        {
          type: "component",
          componentName: "source",
          title: "SOURCE",
          isClosable: false,
          componentState: {
            readOnly: false,
          },
        },
        {
          type: "column",
          content: [
            {
              type: "row",
              content: [
                {
                  type: "component",
                  componentName: "stdin",
                  title: "标准输入",
                  isClosable: false,
                  componentState: {
                    readOnly: false,
                  },
                },

                {
                  type: "component",
                  componentName: "expout",
                  title: "预期输出",
                  isClosable: false,
                  componentState: {
                    readOnly: false,
                  },
                },
              ],
            },

            {
              type: "row",
              content: [
                {
                  type: "stack",
                  content: [
                    {
                      type: "component",
                      componentName: "stdout",
                      title: "标准输出",
                      isClosable: false,
                      componentState: {
                        readOnly: true,
                      },
                    },
                    {
                      type: "component",
                      componentName: "stderr",
                      title: "错误信息",
                      isClosable: false,
                      componentState: {
                        readOnly: true,
                      },
                    },
                    {
                      type: "component",
                      componentName: "compile output",
                      title: "编译器输出",
                      isClosable: false,
                      componentState: {
                        readOnly: true,
                      },
                    },
                    {
                      type: "component",
                      componentName: "sandbox message",
                      title: "沙箱输出",
                      isClosable: false,
                      componentState: {
                        readOnly: true,
                      },
                    },
                  ],
                },

                {
                  type: "component",
                  componentName: "console message",
                  title: "系统信息",
                  isClosable: false,
                  componentState: {
                    readOnly: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function encode(str) {
  return btoa(unescape(encodeURIComponent(str || "")));
}

function decode(bytes) {
  var escaped = escape(atob(bytes || ""));
  try {
    return decodeURIComponent(escaped);
  } catch {
    return unescape(escaped);
  }
}

function localStorageSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (ignorable) {}
}

function localStorageGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (ignorable) {
    return null;
  }
}

// function showMessages() {
//   var width =
//     $updates.offset().left -
//     parseFloat($updates.css("padding-left")) -
//     $navigationMessage.parent().offset().left -
//     parseFloat($navigationMessage.parent().css("padding-left")) -
//     5;

//   if (width < 200 || messagesData === undefined) {
//     return;
//   }

//   var messages = messagesData["messages"];

//   $navigationMessage.css("animation-duration", messagesData["duration"]);
//   $navigationMessage.parent().width(width - 5);

//   var combinedMessage = "";
//   for (var i = 0; i < messages.length; ++i) {
//     combinedMessage += `${messages[i]}`;
//     if (i != messages.length - 1) {
//       combinedMessage += "&nbsp".repeat(Math.min(200, messages[i].length));
//     }
//   }

//   $navigationMessage.html(combinedMessage);
// }

// function loadMessages() {
//   $.ajax({
//     url: `https://minio.judge0.com/public/ide/messages.json?${Date.now()}`,
//     type: "GET",
//     headers: {
//       Accept: "application/json",
//     },
//     success: function (data, textStatus, jqXHR) {
//       messagesData = data;
//       showMessages();
//     },
//   });
// }
function IsPC() {
  var userAgentInfo = navigator.userAgent;
  var Agents = [
    "Android",
    "iPhone",
    "SymbianOS",
    "Windows Phone",
    "iPad",
    "iPod",
  ];
  var flag = true;
  for (var v = 0; v < Agents.length; v++) {
    if (userAgentInfo.indexOf(Agents[v]) > 0) {
      flag = false;
      break;
    }
  }
  return flag;
}

function showError() {
  $("#site-modal #title").html("<i class='exclamation triangle icon'></i>错误");
  $("#site-modal .content").html(
    "<div class='ui form'><div class='inline fields'><span id='sites-info'>网络或服务器异常，请确认已经连接到以太网或稍等片刻再试</span></div>"
  );
  $("#site-modal").modal("show");
  consoleOutputEditor.setValue("Network Error.");
}

function handleError(jqXHR, textStatus, errorThrown) {
  showError();
}

function handleRunError(jqXHR, textStatus, errorThrown) {
  handleError(jqXHR, textStatus, errorThrown);
  $runBtn.removeClass("loading");
}

function handleResult(data) {
  timeEnd = performance.now();
  console.log(
    "It took " + (timeEnd - timeStart) + " ms to get submission result."
  );
  var consoleout = "\nFetched result successfully.\n";
  var status = data.status;
  var stdout = decode(data.stdout);
  var stderr = decode(data.stderr);
  var compile_output = decode(data.compile_output);
  var sandbox_message = decode(data.message);
  var time = data.time === null ? "-" : data.time + "s";
  var memory = data.memory === null ? "-" : data.memory + "KB";

  $statusLine.html(`${status.description}, ${time}, ${memory}`);

  $statusLine.addClass("blink");
  setTimeout(function () {
    $statusLine.removeClass("blink");
  }, 3000);

  if (
    status.description === "Accepted" ||
    status.description === "Wrong Answer"
  ) {
    if (expectOutputEditor.getValue() !== "") {
      consoleout =
        consoleout +
        "Run Finished  ( " +
        status.description +
        " )\n" +
        "Time Used: " +
        time +
        "\nMemory Used: " +
        memory;
    } else {
      consoleout =
        consoleout +
        "Run Finished.\n" +
        "Time Used: " +
        time +
        "\nMemory Used: " +
        memory;
    }
  } else {
    consoleout =
      consoleout +
      "Run Failed  ( " +
      status.description +
      " )\n" +
      "Time Used: " +
      time +
      "\nMemory Used: " +
      memory;
  }
  stdoutEditor.setValue(stdout);
  stderrEditor.setValue(stderr);
  compileOutputEditor.setValue(compile_output);
  sandboxMessageEditor.setValue(sandbox_message);
  consoleOutputEditor.setValue(consoleOutputEditor.getValue() + consoleout);
  if (stdout !== "") {
    var dot = document.getElementById("stdout-dot");
    if (!dot.parentElement.classList.contains("lm_active")) {
      dot.hidden = false;
    }
  }
  if (stderr !== "") {
    var dot = document.getElementById("stderr-dot");
    if (!dot.parentElement.classList.contains("lm_active")) {
      dot.hidden = false;
    }
  }
  if (compile_output !== "") {
    var dot = document.getElementById("compile-output-dot");
    if (!dot.parentElement.classList.contains("lm_active")) {
      dot.hidden = false;
    }
  }
  if (sandbox_message !== "") {
    var dot = document.getElementById("sandbox-message-dot");
    if (!dot.parentElement.classList.contains("lm_active")) {
      dot.hidden = false;
    }
  }

  $runBtn.removeClass("loading");
}

function getIdFromURI() {
  var uri = location.search.substr(1).trim();
  return uri.split("&")[0];
}

function save() {
  localStorageSetItem("source_code", encode(sourceEditor.getValue()));
  localStorageSetItem("language_id", $selectLanguage.val());
  $("#site-message").css("display", "display");
  $("#site-message").fadeTo("700", 1);
  setTimeout("$('#site-message').fadeOut('3000')", 1000);
  // $("#site-modal #title").html("提示");
  // $("#site-modal .content").html("代码已保存");
  // $("#site-modal").modal("show");
}

// function downloadSource() {
//   var value = parseInt($selectLanguage.val());
//   download(sourceEditor.getValue(), fileNames[value], "text/plain");
// }
function deleteSaveedSource() {
  localStorage.removeItem("source_code");
  localStorage.removeItem("language_id");
}
function loadSavedSource() {
  sourceEditor.setValue(decode(localStorageGetItem("source_code")));
  $selectLanguage.dropdown("set selected", localStorageGetItem("language_id"));
  deleteSaveedSource();
  //   $compilerOptions.val(data["compiler_options"]);
  //   $commandLineArguments.val(data["command_line_arguments"]);
  //   stdinEditor.setValue(decode(data["stdin"]));
  //   stdoutEditor.setValue(decode(data["stdout"]));
  //   stderrEditor.setValue(decode(data["stderr"]));
  //   compileOutputEditor.setValue(decode(data["compile_output"]));
  //   sandboxMessageEditor.setValue(decode(data["message"]));
  //   var time = data.time === null ? "-" : data.time + "s";
  //   var memory = data.memory === null ? "-" : data.memory + "KB";
  //   $statusLine.html(`${data.status.description}, ${time}, ${memory}`);
  changeEditorLanguage();
}
function chkstat() {
  var opt = "";
  var cnt = 0;
  $.ajax({
    url: apiUrl + "/statistics?invalidate_cache=true",
    type: "GET",
    async: false,
    success: function (data, textStatus, jqXHR) {
      //console.log(data);
      cnt = data.submissions.today;
    },
  });
  $.ajax({
    url: apiUrl + "/workers",
    type: "GET",
    async: false,
    success: function (data, textStatus, jqXHR) {
      //console.log(data[0].available);
      if (data[0].available === 1) {
        opt += "服务器";
        opt += "<span style='color: green;'> 可用</span>";
      } else {
        opt += "服务器";
        opt += "<span style='color: red;'> 不可用</span>";
      }
      opt += "<br><br>目前队列中有 ";
      opt += data[0].size;
      opt += " 个提交，今日已处理 ";
      opt += cnt;
      opt += " 个提交</br>";
      $serverstat.html(opt);
    },
    error: $serverstat.html("服务器 <span style='color: red;'> 不可用</span>"),
    //error:opt +="<span style='color: red;'> 不可用</span>",
  });
}
function run() {
  if ($runBtn.hasClass("loading")) return;
  document.getElementById("stdout-dot").hidden = true;
  document.getElementById("stderr-dot").hidden = true;
  document.getElementById("compile-output-dot").hidden = true;
  document.getElementById("sandbox-message-dot").hidden = true;

  stdoutEditor.setValue("");
  stderrEditor.setValue("");
  compileOutputEditor.setValue("");
  sandboxMessageEditor.setValue("");
  consoleOutputEditor.setValue("");

  if (sourceEditor.getValue().trim() === "") {
    showError("Error", "Source code can't be empty!");
    consoleOutputEditor.setValue("Submitted Failed( Empty file ).");
    return;
  } else {
    $runBtn.addClass("loading");
  }
  var sourceValue = encode(sourceEditor.getValue());
  var stdinValue = encode(stdinEditor.getValue());
  var expoutValue = encode(expectOutputEditor.getValue());
  var languageId = resolveLanguageId($selectLanguage.val());
  if (languageId == 1020) {
    languageId = 54;
    var compilerOptions =
      "-fno-asm -O2 -Wall -lm --static -DONLINE_JUDGE" + $compilerOptions.val();
  } else var compilerOptions = $compilerOptions.val();
  var commandLineArguments = $commandLineArguments.val();

  if (parseInt(languageId) === 44) {
    sourceValue = sourceEditor.getValue();
  }
  //compilerOptions+="-fno-asm -O2 -Wall -lm --static -DONLINE_JUDGE";
  if (expoutValue == "") {
    var data = {
      source_code: sourceValue,
      language_id: languageId,
      stdin: stdinValue,
      compiler_options: compilerOptions,
      command_line_arguments: commandLineArguments,
      redirect_stderr_to_stdout: redirectStderrToStdout,
    };
  } else {
    var data = {
      source_code: sourceValue,
      language_id: languageId,
      stdin: stdinValue,
      expected_output: expoutValue,
      compiler_options: compilerOptions,
      command_line_arguments: commandLineArguments,
      redirect_stderr_to_stdout: redirectStderrToStdout,
    };
  }
  save();
  var sendRequest = function (data) {
    timeStart = performance.now();
    $.ajax({
      url: apiUrl + `/submissions?base64_encoded=true&wait=${wait}`,
      type: "POST",
      async: true,
      contentType: "application/json",
      data: JSON.stringify(data),
      xhrFields: {
        withCredentials: apiUrl.indexOf("/secure") != -1 ? true : false,
      },
      success: function (data, textStatus, jqXHR) {
        console.log(`Your submission token is: ${data.token}`);
        if (wait == true) {
          handleResult(data);
        } else {
          setTimeout(fetchSubmission.bind(null, data.token), check_timeout);
        }
      },
      error: handleRunError,
    });
  };

  var fetchAdditionalFiles = false;
  if (parseInt(languageId) === 82) {
    if (sqliteAdditionalFiles === "") {
      fetchAdditionalFiles = true;
      $.ajax({
        url: `https://minio.judge0.com/public/ide/sqliteAdditionalFiles.base64.txt?${Date.now()}`,
        type: "GET",
        async: true,
        contentType: "text/plain",
        success: function (responseData, textStatus, jqXHR) {
          sqliteAdditionalFiles = responseData;
          data["additional_files"] = sqliteAdditionalFiles;
          sendRequest(data);
        },
        error: handleRunError,
      });
    } else {
      data["additional_files"] = sqliteAdditionalFiles;
    }
  }

  if (!fetchAdditionalFiles) {
    sendRequest(data);
  }
}

function fetchSubmission(submission_token) {
  $.ajax({
    url: apiUrl + "/submissions/" + submission_token + "?base64_encoded=true",
    type: "GET",
    async: true,
    success: function (data, textStatus, jqXHR) {
      if (data.status.id <= 2) {
        // In Queue or Processing
        var tmp = consoleOutputEditor.getValue();
        if (tmp === "") {
          tmp = "Source Code has been saved.\nSubmitted!\nRunning";
        } else {
          tmp += ".";
        }
        consoleOutputEditor.setValue(tmp);
        setTimeout(fetchSubmission.bind(null, submission_token), check_timeout);
        return;
      }
      handleResult(data);
    },
    error: handleRunError,
  });
}

function changeEditorLanguage() {
  monaco.editor.setModelLanguage(
    sourceEditor.getModel(),
    $selectLanguage.find(":selected").attr("mode")
  );
  currentLanguageId = parseInt($selectLanguage.val());
  $(".lm_title")[0].innerText = fileNames[currentLanguageId];
  apiUrl = resolveApiUrl($selectLanguage.val());
}

function insertTemplate() {
  currentLanguageId = parseInt($selectLanguage.val());
  sourceEditor.setValue(sources[currentLanguageId]);
  changeEditorLanguage();
}

function loadRandomLanguage() {
  var values = [];
  for (var i = 0; i < $selectLanguage[0].options.length; ++i) {
    values.push($selectLanguage[0].options[i].value);
  }
  $selectLanguage.dropdown("set selected", values[11]);
  apiUrl = resolveApiUrl($selectLanguage.val());
  insertTemplate();
}

function resizeEditor(layoutInfo) {
  if (editorMode != "normal") {
    var statusLineHeight = $("#editor-status-line").height();
    layoutInfo.height -= statusLineHeight;
    layoutInfo.contentHeight -= statusLineHeight;
  }
}

function disposeEditorModeObject() {
  try {
    editorModeObject.dispose();
    editorModeObject = null;
  } catch (ignorable) {}
}

function changeEditorMode() {
  disposeEditorModeObject();

  if (editorMode == "vim") {
    editorModeObject = MonacoVim.initVimMode(
      sourceEditor,
      $("#editor-status-line")[0]
    );
  } else if (editorMode == "emacs") {
    var statusNode = $("#editor-status-line")[0];
    editorModeObject = new MonacoEmacs.EmacsExtension(sourceEditor);
    editorModeObject.onDidMarkChange(function (e) {
      statusNode.textContent = e ? "Mark Set!" : "Mark Unset";
    });
    editorModeObject.onDidChangeKey(function (str) {
      statusNode.textContent = str;
    });
    editorModeObject.start();
  }
}

function resolveLanguageId(id) {
  id = parseInt(id);
  return languageIdTable[id] || id;
}

function resolveApiUrl(id) {
  id = parseInt(id);
  return languageApiUrlTable[id] || defaultUrl;
}

function editorsUpdateFontSize(font_Size) {
  sourceEditor.updateOptions({ fontSize: font_Size });
  stdinEditor.updateOptions({ fontSize: font_Size });
  expectOutputEditor.updateOptions({ fontSize: font_Size });
  stdoutEditor.updateOptions({ fontSize: font_Size });
  stderrEditor.updateOptions({ fontSize: font_Size });
  compileOutputEditor.updateOptions({ fontSize: font_Size });
  sandboxMessageEditor.updateOptions({ fontSize: font_Size });
  consoleOutputEditor.updateOptions({ fontSize: font_Size });
}

function updateScreenElements() {
  var display = window.innerWidth <= 1200 ? "none" : "";
  $(".wide.screen.only").each(function (index) {
    $(this).css("display", display);
  });
}

$(window).resize(function () {
  layout.updateSize();
  updateScreenElements();
  //   showMessages();
});

$(document).ready(function () {
  updateScreenElements();

  console.log(
    "Hey, Judge0 IDE is open-sourced: https://github.com/judge0/ide. Have fun!"
  );

  $selectLanguage = $("#select-language");
  $selectLanguage.change(function (e) {
    if (!isEditorDirty || sourceEditor.getValue() === "") {
      insertTemplate();
    } else {
      changeEditorLanguage();
    }
  });

  $compilerOptions = $("#compiler-options");
  $commandLineArguments = $("#command-line-arguments");
  $commandLineArguments.attr(
    "size",
    $commandLineArguments.attr("placeholder").length
  );

  $insertTemplateBtn = $("#insert-template-btn");
  $insertTemplateBtn.click(function (e) {
    if (isEditorDirty && confirm("现存代码将被删除，是否确认？")) {
      insertTemplate();
      deleteSaveedSource();
    }
  });
  $savedmessage = $("ui icon message");
  $runBtn = $("#run-btn");
  $staBtn = $("#status-btn");
  $staBtn.click(function (e) {
    chkstat();
  });
  $runBtn.click(function (e) {
    run();
  });

  // $navigationMessage = $("#navigation-message span");
  // $updates = $("#updates");

  $(`input[name="editor-mode"][value="${editorMode}"]`).prop("checked", true);
  $('input[name="editor-mode"]').on("change", function (e) {
    editorMode = e.target.value;
    localStorageSetItem("editorMode", editorMode);

    resizeEditor(sourceEditor.getLayoutInfo());
    changeEditorMode();

    sourceEditor.focus();
  });

  $('input[name="redirect-output"]').prop("checked", redirectStderrToStdout);
  $('input[name="redirect-output"]').on("change", function (e) {
    redirectStderrToStdout = e.target.checked;
    localStorageSetItem("redirectStderrToStdout", redirectStderrToStdout);
  });

  $statusLine = $("#status-line");

  $serverstat = $("#server-stat-info");

  $("body").keydown(function (e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode == 120) {
      // F9
      e.preventDefault();
      run();
    }
    // else if (keyCode == 119) { // F8
    //     e.preventDefault();
    //     var url = prompt("Enter URL of Judge0 API:", apiUrl);
    //     if (url != null) {
    //         url = url.trim();
    //     }
    //     if (url != null && url != "") {
    //         apiUrl = url;
    //         localStorageSetItem("api-url", apiUrl);
    //     }
    // }
    // else if (keyCode == 118) {
    //   // F7
    //   e.preventDefault();
    //   wait = !wait;
    //   localStorageSetItem("wait", wait);
    //   alert(`Submission wait is ${wait ? "ON. Enjoy" : "OFF"}.`);
    // }
    else if (event.ctrlKey && keyCode == 83) {
      // Ctrl+S
      e.preventDefault();
      save();
    } else if (
      event.shiftKey &&
      event.altKey &&
      (keyCode == 107 || keyCode == 187)
    ) {
      // Ctrl++
      e.preventDefault();
      font_Size += 1;
      editorsUpdateFontSize(font_Size);
    } else if (
      event.shiftKey &&
      event.altKey &&
      (keyCode == 109 || keyCode == 189)
    ) {
      // Ctrl+-
      e.preventDefault();
      font_Size -= 1;
      editorsUpdateFontSize(font_Size);
    }
  });

  $("select.dropdown").dropdown();
  $(".ui.dropdown").dropdown();
  $(".ui.dropdown.site-links").dropdown({ action: "hide", on: "hover" });
  $(".ui.checkbox").checkbox();
  $(".message .close").on("click", function () {
    $(this).closest(".message").transition("fade");
  });

  //loadMessages();

  require([
    "vs/editor/editor.main",
    "monaco-vim",
    "monaco-emacs",
  ], function (ignorable, MVim, MEmacs) {
    layout = new GoldenLayout(layoutConfig, $("#site-content"));

    MonacoVim = MVim;
    MonacoEmacs = MEmacs;
    if (IsPC()) {
      font_Size = 18;
    } else {
      font_Size = 14;
    }
    layout.registerComponent("source", function (container, state) {
      sourceEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        theme: "vs-dark",
        scrollBeyondLastLine: true,
        readOnly: state.readOnly,
        language: "cpp",
        fontSize: font_Size,
        minimap: {
          enabled: true,
        },
        rulers: [80, 120],
      });

      changeEditorMode();

      sourceEditor.getModel().onDidChangeContent(function (e) {
        currentLanguageId = parseInt($selectLanguage.val());
        isEditorDirty = sourceEditor.getValue() != sources[currentLanguageId];
      });

      sourceEditor.onDidLayoutChange(resizeEditor);
    });

    layout.registerComponent("stdin", function (container, state) {
      stdinEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        theme: "vs-dark",
        scrollBeyondLastLine: false,
        fontSize: font_Size,
        readOnly: state.readOnly,
        language: "plaintext",
        minimap: {
          enabled: false,
        },
      });
    });

    layout.registerComponent("expout", function (container, state) {
      expectOutputEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        theme: "vs-dark",
        scrollBeyondLastLine: false,
        fontSize: font_Size,
        readOnly: state.readOnly,
        language: "plaintext",
        minimap: {
          enabled: false,
        },
      });
      container.on("tab", function (tab) {
        tab.element.append('<span id="expout-dot" class="dot" hidden></span>');
        tab.element.on("mousedown", function (e) {
          e.target.closest(".lm_tab").children[3].hidden = true;
        });
      });
    });

    layout.registerComponent("stdout", function (container, state) {
      stdoutEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        theme: "vs-dark",
        scrollBeyondLastLine: false,
        fontSize: font_Size,
        readOnly: state.readOnly,
        language: "plaintext",
        minimap: {
          enabled: false,
        },
      });

      container.on("tab", function (tab) {
        tab.element.append('<span id="stdout-dot" class="dot" hidden></span>');
        tab.element.on("mousedown", function (e) {
          e.target.closest(".lm_tab").children[3].hidden = true;
        });
      });
    });

    layout.registerComponent("stderr", function (container, state) {
      stderrEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        theme: "vs-dark",
        scrollBeyondLastLine: false,
        fontSize: font_Size,
        readOnly: state.readOnly,
        language: "plaintext",
        minimap: {
          enabled: false,
        },
      });

      container.on("tab", function (tab) {
        tab.element.append('<span id="stderr-dot" class="dot" hidden></span>');
        tab.element.on("mousedown", function (e) {
          e.target.closest(".lm_tab").children[3].hidden = true;
        });
      });
    });

    layout.registerComponent("compile output", function (container, state) {
      compileOutputEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        theme: "vs-dark",
        scrollBeyondLastLine: false,
        readOnly: state.readOnly,
        fontSize: font_Size,
        language: "plaintext",
        minimap: {
          enabled: false,
        },
      });

      container.on("tab", function (tab) {
        tab.element.append(
          '<span id="compile-output-dot" class="dot" hidden></span>'
        );
        tab.element.on("mousedown", function (e) {
          e.target.closest(".lm_tab").children[3].hidden = true;
        });
      });
    });

    layout.registerComponent("sandbox message", function (container, state) {
      sandboxMessageEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        theme: "vs-dark",
        scrollBeyondLastLine: false,
        readOnly: state.readOnly,
        fontSize: font_Size,
        language: "plaintext",
        minimap: {
          enabled: false,
        },
      });

      container.on("tab", function (tab) {
        tab.element.append(
          '<span id="sandbox-message-dot" class="dot" hidden></span>'
        );
        tab.element.on("mousedown", function (e) {
          e.target.closest(".lm_tab").children[3].hidden = true;
        });
      });
    });

    layout.registerComponent("console message", function (container, state) {
      consoleOutputEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        theme: "vs-dark",
        scrollBeyondLastLine: false,
        readOnly: state.readOnly,
        fontSize: font_Size,
        language: "plaintext",
        minimap: {
          enabled: false,
        },
      });

      container.on("tab", function (tab) {
        tab.element.append(
          '<span id="console-message-dot" class="dot" hidden></span>'
        );
        tab.element.on("mousedown", function (e) {
          e.target.closest(".lm_tab").children[3].hidden = true;
        });
      });
    });

    layout.on("initialised", function () {
      $(".monaco-editor")[0].appendChild($("#editor-status-line")[0]);
      if (
        localStorageGetItem("source_code") &&
        localStorageGetItem("language_id")
      ) {
        loadSavedSource();
      } else {
        loadRandomLanguage();
      }

      $("#site-navigation").css("border-bottom", "1px solid black");
      sourceEditor.focus();
    });

    layout.init();
    consoleOutputEditor.setValue("Welcome to yltf Web IDE!\nHave fun!");
  });
});

// Template Sources
var assemblySource =
  "\
section	.text\n\
    global _start\n\
\n\
_start:\n\
\n\
    xor	eax, eax\n\
    lea	edx, [rax+len]\n\
    mov	al, 1\n\
    mov	esi, msg\n\
    mov	edi, eax\n\
    syscall\n\
\n\
    xor	edi, edi\n\
    lea	eax, [rdi+60]\n\
    syscall\n\
\n\
section	.rodata\n\
\n\
msg	db 'hello, world', 0xa\n\
len	equ	$ - msg\n\
";

var bashSource = 'echo "hello, world"';

var basicSource = 'PRINT "hello, world"';

var cSource =
  '\
#include <stdio.h>\n\
\n\
int main(void) {\n\
    printf("hello, world\\n");\n\
    return 0;\n\
}\n\
';

var csharpSource =
  '\
public class Hello {\n\
    public static void Main() {\n\
        System.Console.WriteLine("hello, world");\n\
    }\n\
}\n\
';

var cppSource =
  '\
#include <iostream>\n\
\n\
int main() {\n\
    std::cout << "hello, world" << std::endl;\n\
    return 0;\n\
}\n\
';

var clojureSource = '(println "hello, world")\n';

var cobolSource =
  '\
IDENTIFICATION DIVISION.\n\
PROGRAM-ID. MAIN.\n\
PROCEDURE DIVISION.\n\
DISPLAY "hello, world".\n\
STOP RUN.\n\
';

var lispSource = '(write-line "hello, world")';

var dSource =
  '\
import std.stdio;\n\
\n\
void main()\n\
{\n\
    writeln("hello, world");\n\
}\n\
';

var elixirSource = 'IO.puts "hello, world"';

var erlangSource = '\
main(_) ->\n\
    io:fwrite("hello, world\\n").\n\
';

var executableSource =
  '\
Judge0 IDE assumes that content of executable is Base64 encoded.\n\
\n\
This means that you should Base64 encode content of your binary,\n\
paste it here and click "Run".\n\
\n\
Here is an example of compiled "hello, world" NASM program.\n\
Content of compiled binary is Base64 encoded and used as source code.\n\
\n\
https://ide.judge0.com/?kS_f\n\
';

var fsharpSource = 'printfn "hello, world"\n';

var fortranSource = '\
program main\n\
    print *, "hello, world"\n\
end\n\
';

var goSource =
  '\
package main\n\
\n\
import "fmt"\n\
\n\
func main() {\n\
    fmt.Println("hello, world")\n\
}\n\
';

var groovySource = 'println "hello, world"\n';

var haskellSource = 'main = putStrLn "hello, world"';

var javaSource =
  '\
public class Main {\n\
    public static void main(String[] args) {\n\
        System.out.println("hello, world");\n\
    }\n\
}\n\
';

var javaScriptSource = 'console.log("hello, world");';

var kotlinSource = '\
fun main() {\n\
    println("hello, world")\n\
}\n\
';

var luaSource = 'print("hello, world")';

var objectiveCSource =
  '\
#import <Foundation/Foundation.h>\n\
\n\
int main() {\n\
    @autoreleasepool {\n\
        char name[10];\n\
        scanf("%s", name);\n\
        NSString *message = [NSString stringWithFormat:@"hello, %s\\n", name];\n\
        printf("%s", message.UTF8String);\n\
    }\n\
    return 0;\n\
}\n\
';

var ocamlSource = 'print_endline "hello, world"';

var octaveSource = 'printf("hello, world\\n");';

var pascalSource =
  "\
program Hello;\n\
begin\n\
    writeln ('hello, world')\n\
end.\n\
";

var perlSource = '\
my $name = <STDIN>;\n\
print "hello, $name";\n\
';

var phpSource = '\
<?php\n\
print("hello, world\\n");\n\
?>\n\
';

var plainTextSource = "hello, world\n";

var prologSource =
  "\
:- initialization(main).\n\
main :- write('hello, world\\n').\n\
";

var pythonSource = 'print("hello, world")';

var rSource = 'cat("hello, world\\n")';

var rubySource = 'puts "hello, world"';

var rustSource = '\
fn main() {\n\
    println!("hello, world");\n\
}\n\
';

var scalaSource =
  '\
object Main {\n\
    def main(args: Array[String]) = {\n\
        val name = scala.io.StdIn.readLine()\n\
        println("hello, "+ name)\n\
    }\n\
}\n\
';

var sqliteSource =
  "\
-- On Judge0 IDE your SQL script is run on chinook database (https://www.sqlitetutorial.net/sqlite-sample-database).\n\
-- For more information about how to use SQL with Judge0 API please\n\
-- watch this asciicast: https://asciinema.org/a/326975.\n\
SELECT\n\
    Name, COUNT(*) AS num_albums\n\
FROM artists JOIN albums\n\
ON albums.ArtistID = artists.ArtistID\n\
GROUP BY Name\n\
ORDER BY num_albums DESC\n\
LIMIT 4;\n\
";
var sqliteAdditionalFiles = "";

var swiftSource =
  '\
import Foundation\n\
let name = readLine()\n\
print("hello, \\(name!)")\n\
';

var typescriptSource = 'console.log("hello, world");';

var vbSource =
  '\
Public Module Program\n\
   Public Sub Main()\n\
      Console.WriteLine("hello, world")\n\
   End Sub\n\
End Module\n\
';

var c3Source =
  '\
// On the Judge0 IDE, C3 is automatically\n\
// updated every hour to the latest commit on master branch.\n\
module main;\n\
\n\
extern func void printf(char *str, ...);\n\
\n\
func int main()\n\
{\n\
    printf("hello, world\\n");\n\
    return 0;\n\
}\n\
';

var javaTestSource =
  "\
import static org.junit.jupiter.api.Assertions.assertEquals;\n\
\n\
import org.junit.jupiter.api.Test;\n\
\n\
class MainTest {\n\
    static class Calculator {\n\
        public int add(int x, int y) {\n\
            return x + y;\n\
        }\n\
    }\n\
\n\
    private final Calculator calculator = new Calculator();\n\
\n\
    @Test\n\
    void addition() {\n\
        assertEquals(2, calculator.add(1, 1));\n\
    }\n\
}\n\
";

var mpiccSource =
  '\
// Try adding "-n 5" (without quotes) into command line arguments. \n\
#include <mpi.h>\n\
\n\
#include <stdio.h>\n\
\n\
int main()\n\
{\n\
    MPI_Init(NULL, NULL);\n\
\n\
    int world_size;\n\
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);\n\
\n\
    int world_rank;\n\
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);\n\
\n\
    printf("Hello from processor with rank %d out of %d processors.\\n", world_rank, world_size);\n\
\n\
    MPI_Finalize();\n\
\n\
    return 0;\n\
}\n\
';

var mpicxxSource =
  '\
// Try adding "-n 5" (without quotes) into command line arguments. \n\
#include <mpi.h>\n\
\n\
#include <iostream>\n\
\n\
int main()\n\
{\n\
    MPI_Init(NULL, NULL);\n\
\n\
    int world_size;\n\
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);\n\
\n\
    int world_rank;\n\
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);\n\
\n\
    std::cout << "Hello from processor with rank "\n\
              << world_rank << " out of " << world_size << " processors.\\n";\n\
\n\
    MPI_Finalize();\n\
\n\
    return 0;\n\
}\n\
';

var mpipySource =
  '\
# Try adding "-n 5" (without quotes) into command line arguments. \n\
from mpi4py import MPI\n\
\n\
comm = MPI.COMM_WORLD\n\
world_size = comm.Get_size()\n\
world_rank = comm.Get_rank()\n\
\n\
print(f"Hello from processor with rank {world_rank} out of {world_size} processors")\n\
';

var nimSource =
  '\
# On the Judge0 IDE, Nim is automatically\n\
# updated every day to the latest stable version.\n\
echo "hello, world"\n\
';

var pythonForMlSource =
  '\
import mlxtend\n\
import numpy\n\
import pandas\n\
import scipy\n\
import sklearn\n\
\n\
print("hello, world")\n\
';

var bosqueSource =
  '\
// On the Judge0 IDE, Bosque (https://github.com/microsoft/BosqueLanguage)\n\
// is automatically updated every hour to the latest commit on master branch.\n\
\n\
namespace NSMain;\n\
\n\
concept WithName {\n\
    invariant $name != "";\n\
\n\
    field name: String;\n\
}\n\
\n\
concept Greeting {\n\
    abstract method sayHello(): String;\n\
    \n\
    virtual method sayGoodbye(): String {\n\
        return "goodbye";\n\
    }\n\
}\n\
\n\
entity GenericGreeting provides Greeting {\n\
    const instance: GenericGreeting = GenericGreeting@{};\n\
\n\
    override method sayHello(): String {\n\
        return "hello world";\n\
    }\n\
}\n\
\n\
entity NamedGreeting provides WithName, Greeting {\n\
    override method sayHello(): String {\n\
        return String::concat("hello", " ", this.name);\n\
    }\n\
}\n\
\n\
entrypoint function main(arg?: String): String {\n\
    var val = arg ?| "";\n\
    if (val == "1") {\n\
        return GenericGreeting@{}.sayHello();\n\
    }\n\
    elif (val == "2") {\n\
        return GenericGreeting::instance.sayHello();\n\
    }\n\
    else {\n\
        return NamedGreeting@{name="bob"}.sayHello();\n\
    }\n\
}\n\
';

var cppTestSource =
  "\
#include <gtest/gtest.h>\n\
\n\
int add(int x, int y) {\n\
    return x + y;\n\
}\n\
\n\
TEST(AdditionTest, NeutralElement) {\n\
    EXPECT_EQ(1, add(1, 0));\n\
    EXPECT_EQ(1, add(0, 1));\n\
    EXPECT_EQ(0, add(0, 0));\n\
}\n\
\n\
TEST(AdditionTest, CommutativeProperty) {\n\
    EXPECT_EQ(add(2, 3), add(3, 2));\n\
}\n\
\n\
int main(int argc, char **argv) {\n\
    ::testing::InitGoogleTest(&argc, argv);\n\
    return RUN_ALL_TESTS();\n\
}\n\
";

var csharpTestSource =
  "\
using NUnit.Framework;\n\
\n\
public class Calculator\n\
{\n\
    public int add(int a, int b)\n\
    {\n\
        return a + b;\n\
    }\n\
}\n\
\n\
[TestFixture]\n\
public class Tests\n\
{\n\
    private Calculator calculator;\n\
\n\
    [SetUp]\n\
    protected void SetUp()\n\
    {\n\
        calculator = new Calculator();\n\
    }\n\
\n\
    [Test]\n\
    public void NeutralElement()\n\
    {\n\
        Assert.AreEqual(1, calculator.add(1, 0));\n\
        Assert.AreEqual(1, calculator.add(0, 1));\n\
        Assert.AreEqual(0, calculator.add(0, 0));\n\
    }\n\
\n\
    [Test]\n\
    public void CommutativeProperty()\n\
    {\n\
        Assert.AreEqual(calculator.add(2, 3), calculator.add(3, 2));\n\
    }\n\
}\n\
";

var sources = {
  45: assemblySource,
  46: bashSource,
  47: basicSource,
  48: cSource,
  49: cSource,
  50: cSource,
  51: csharpSource,
  52: cppSource,
  53: cppSource,
  54: cppSource,
  55: lispSource,
  56: dSource,
  57: elixirSource,
  58: erlangSource,
  44: executableSource,
  59: fortranSource,
  60: goSource,
  61: haskellSource,
  62: javaSource,
  63: javaScriptSource,
  64: luaSource,
  65: ocamlSource,
  66: octaveSource,
  67: pascalSource,
  68: phpSource,
  43: plainTextSource,
  69: prologSource,
  70: pythonSource,
  71: pythonSource,
  72: rubySource,
  73: rustSource,
  74: typescriptSource,
  75: cSource,
  76: cppSource,
  77: cobolSource,
  78: kotlinSource,
  79: objectiveCSource,
  80: rSource,
  81: scalaSource,
  82: sqliteSource,
  83: swiftSource,
  84: vbSource,
  85: perlSource,
  86: clojureSource,
  87: fsharpSource,
  88: groovySource,
  1001: cSource,
  1002: cppSource,
  1003: c3Source,
  1004: javaSource,
  1005: javaTestSource,
  1006: mpiccSource,
  1007: mpicxxSource,
  1008: mpipySource,
  1009: nimSource,
  1010: pythonForMlSource,
  1011: bosqueSource,
  1012: cppTestSource,
  1013: cSource,
  1014: cppSource,
  1015: cppTestSource,
  1016: csharpSource,
  1017: csharpSource,
  1018: csharpTestSource,
  1019: fsharpSource,
  1020: cppSource,
};

var fileNames = {
  45: "main.asm",
  46: "script.sh",
  47: "main.bas",
  48: "main.c",
  49: "main.c",
  50: "main.c",
  51: "Main.cs",
  52: "main.cpp",
  53: "main.cpp",
  54: "main.cpp",
  55: "script.lisp",
  56: "main.d",
  57: "script.exs",
  58: "main.erl",
  44: "a.out",
  59: "main.f90",
  60: "main.go",
  61: "main.hs",
  62: "Main.java",
  63: "script.js",
  64: "script.lua",
  65: "main.ml",
  66: "script.m",
  67: "main.pas",
  68: "script.php",
  43: "text.txt",
  69: "main.pro",
  70: "script.py",
  71: "script.py",
  72: "script.rb",
  73: "main.rs",
  74: "script.ts",
  75: "main.c",
  76: "main.cpp",
  77: "main.cob",
  78: "Main.kt",
  79: "main.m",
  80: "script.r",
  81: "Main.scala",
  82: "script.sql",
  83: "Main.swift",
  84: "Main.vb",
  85: "script.pl",
  86: "main.clj",
  87: "script.fsx",
  88: "script.groovy",
  1001: "main.c",
  1002: "main.cpp",
  1003: "main.c3",
  1004: "Main.java",
  1005: "MainTest.java",
  1006: "main.c",
  1007: "main.cpp",
  1008: "script.py",
  1009: "main.nim",
  1010: "script.py",
  1011: "main.bsq",
  1012: "main.cpp",
  1013: "main.c",
  1014: "main.cpp",
  1015: "main.cpp",
  1016: "Main.cs",
  1017: "Main.cs",
  1018: "Test.cs",
  1019: "script.fsx",
  1020: "main.cpp",
};

var languageIdTable = {
  1001: 1,
  1002: 2,
  1003: 3,
  1004: 4,
  1005: 5,
  1006: 6,
  1007: 7,
  1008: 8,
  1009: 9,
  1010: 10,
  1011: 11,
  1012: 12,
  1013: 13,
  1014: 14,
  1015: 15,
  1016: 16,
  1017: 17,
  1018: 18,
  1019: 19,
  1020: 1020,
};

var extraApiUrl = "https://secure.judge0.com/extra";
var languageApiUrlTable = {
  1001: extraApiUrl,
  1002: extraApiUrl,
  1003: extraApiUrl,
  1004: extraApiUrl,
  1005: extraApiUrl,
  1006: extraApiUrl,
  1007: extraApiUrl,
  1008: extraApiUrl,
  1009: extraApiUrl,
  1010: extraApiUrl,
  1011: extraApiUrl,
  1012: extraApiUrl,
  1013: extraApiUrl,
  1014: extraApiUrl,
  1015: extraApiUrl,
  1016: extraApiUrl,
  1017: extraApiUrl,
  1018: extraApiUrl,
  1019: extraApiUrl,
};
