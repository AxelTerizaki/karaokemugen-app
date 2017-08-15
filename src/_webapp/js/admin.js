$(document).ready(function () {
    /*** INITIALISATION ***/
    /* variables & ajax setup */
    var mouseDown = false;

    setupAjax = function (passwordAdmin) {

        $.ajaxSetup({
            headers: { "Authorization": "Basic " + btoa("truc:" + passwordAdmin) },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.status + "  - " + textStatus + "  - " + errorThrown);
            }
        });
    }

    setupAjax(mdpAdmin);

    // dynamic creation of switchable settings 
    var settingsOnOff = ["PlayerPIP", "EngineAllowNicknameChange", "EngineAllowViewBlacklist", "EngineAllowViewBlacklistCriterias"
        , "EngineAllowViewWhitelist", "EngineDisplayNickname", "PlayerFullscreen", "PlayerStayOnTop"
        , "PlayerNoBar", "PlayerNoHud"];
    $.each(settingsOnOff, function (e, val) {
        html = $('<div class="form-group"><label for="' + val + '" class="col-xs-4 control-label">' + val + '</label>'
            + '<div class="col-xs-6"> <input switch="onoff" type="checkbox" name="' + val + '"></div></div>');
        if (val === "PlayerPIP") {
            html.insertBefore('#pipSettings')
        } else {
            $('#settings').append(html);
        }
    });

    /* init functions */

    fillPlaylistSelects = function () {
        var playlistList = {};
        $.ajax({ url: 'admin/playlists', }).done(function (data) {
            playlistList = data;
            playlistList.push({ "id_playlist": -1, "name": "Karas" });
            $.each(playlistList, function (key, value) {
                $("select[type='playlist_select']").append('<option value=' + value.id_playlist + '>' + value.name + '</option>');
            });
            $(".select2").select2({ theme: "bootstrap" });

            // TODO à suppr
            $("[type='playlist_select'][num='1']").val(-1).trigger('change');
            $("[type='playlist_select'][num='2']").val(1).trigger('change');

        }).fail(function (data) {
            $.each(data, function (index, value) {
                $('#consolelog').html($('#consolelog').html() + index + ': ' + value + '<br/>');
            });

        });
    };

    // nameExclude = input not being updated (most likely user is on it)
    getSettings = function (nameExclude) {
        var playlistList = {};
        $.ajax({ url: 'admin/settings' }).done(function (data) {
            $.each(data, function (i, val) {
                input = $('[name="' + i + '"]');
                // console.log(i, val);
                if (input.length == 1 && i != nameExclude) {
                    if (input.attr('type') !== "checkbox") {
                        input.val(val);
                    } else {
                        input.bootstrapSwitch('state', val, true);
                        input.val(val);
                        if (input.attr('name') === "PlayerPIP") {
                            val ? $('#pipSettings').show() : $('#pipSettings').hide();
                        }
                    }
                }
            });
        });
    }

    setSettings = function (e, changeAdminPass) {
        //console.log($(e), $(e).val());
        if (e.attr('oldValue') !== e.val() || e.attr('type') === "checkbox") {
            getSettings(e.attr('name'));

            $('#settings').promise().then(function () {
                settingsArray = {};
                formArray = $('#settings').serializeArray()
                    .concat($('input[type=checkbox]:not(:checked)').map(function () { return { name: this.name, value: "0" }; }).get());

                $(formArray).each(function (index, obj) {
                    console.log(index, obj);
                    settingsArray[obj.name] = obj.value;
                });
                settingsArray['EnginePrivateMode'] = $('input[name="EnginePrivateMode"]').val();
                settingsArray['AdminPassword'] = changeAdminPass ? $('button[name="AdminPassword"]').val() : $('button[name="AdminPassword"]').attr('oldValue');
          
                $.ajax({
                    type: 'PUT',
                    url: 'admin/settings',
                    data: settingsArray
                }).done(function (data) {
                    if (changeAdminPass) {
                        mdpAdmin = $('button[name="AdminPassword"]').val();
                        setupAjax(mdpAdmin);
                    }
                    getSettings();
                });
            });
        }
    }
    /* init selects & switchs */

    fillPlaylistSelects();
    getSettings();

    $("[name='kara_panel']").on('switchChange.bootstrapSwitch', function (event, state) {
        if (state) {
            $('#playlist').hide();
            $('#manage').show();
        } else {
            $('#playlist').show();
            $('#manage').hide();
        }
    });
    $("[name='EnginePrivateMode']").on('switchChange.bootstrapSwitch', function (event, state) {
        console.log(this, event, state);
        // FCT send playlist state (1=private 0=public)

    });
    
    // handling small touchscreen screens with big virtual keyboard
    
    $("select[type='playlist_select']").on('select2:open', function(){
        //$('#header').hide();
         $(".select2-dropdown").css('z-index','9999');
    });
    
    $("select[type='playlist_select']").on('select2:close', function(){
       // $('#header').show();
        $(".select2-dropdown").css('z-index','1051');
        document.body.scrollTop = 0; // For Chrome, Safari and Opera 
        document.documentElement.scrollTop = 0; // For IE and Firefox
    })
    
    // get & build kara list on screen

    $("select[type='playlist_select']").change(function () {
        var val = $(this).val();
        var num = $(this).attr('num');
        // prevent selecting 2 times the same playlist
        $("select[type='playlist_select'][num!=" + num + "] > option").prop("disabled", false);
        $("select[type='playlist_select'][num!=" + num + "] > option[value='" + val + "']").prop("disabled", true);
        $("select[type='playlist_select'][num!=" + num + "]").select2({ theme: "bootstrap" });

        var side = num == 1 ? 'right' : 'left';
        var buttonHtml = '<button onclick="transfer(this);" num="' + num + '" class="btn btn-sm btn-default btn-dark pull-' + side + '">'
            + '<i class="glyphicon glyphicon-arrow-left"></i><i class="glyphicon glyphicon-arrow-right"></i></button>'

        $("#playlist" + num).empty();

        // fill list with kara list
        var urlKaras = "";
        if (val > 0) {
            urlKaras = 'admin/playlists/' + val + '/karas';
        } else if (val == -1) {
            urlKaras = 'public/karas';
        }
        fillPlaylist('playlist' + num, urlKaras, 'list', buttonHtml);
    });

    // TODO change everything, global PUT followed by playlist refresh showing right client infos
    transfer = function (e) {
        var num = $(e).attr('num');
        var newNum = 3 - num;
        var idPlaylistFrom = $("[type='playlist_select'][num='" + num + "']").val();
        var idPlaylistTo = $("[type='playlist_select'][num='" + newNum + "']").val();

        if (idPlaylistFrom == -1) {
            $.ajax({
                type: 'POST',
                url: 'admin/playlists/' + idPlaylistTo + '/karas',
                data: {
                    requestedby: 'admin',
                    kara_id: $(e).parent().attr('idKara')
                }
            }).done(function (data) {
                console.log(data);
                $(e).parent().clone().appendTo('#playlist' + newNum);
            });
        } else {
            $(e).attr('num', newNum);
            $(e).parent().detach().appendTo('#playlist' + newNum);
        }
    };

    $('button[action="command"]').click(function () {
        var val = $(this).val();
        var dataAjax = { command : val };
        if ($(this).attr('options') != undefined) dataAjax['options'] = $(this).attr('options');

        $.ajax({
            url: 'admin/player',
            type: 'PUT',
            data: dataAjax
        }).done(function (data) {
            refreshCommandStates();
        });
    });
    $('input[action="command"][switch="onoff"]').on('switchChange.bootstrapSwitch', function (event) {
        val = $(this).attr('name');
        $.ajax({
            url: 'admin/player',
            type: 'PUT',
            data: { command: val }
        }).done(function (data) {
            refreshCommandStates();
        });
    });

    $('#settings input[type!="checkbox"][exclude!="true"]').blur(function () {
        setSettings($(this));
    });
    $('#settings input[type="checkbox"]').on('switchChange.bootstrapSwitch', function (event) {
        $(this).val($(this).is(':checked') ? 1 : 0);
        setSettings($(this));
    });

    $('#settings input').focus(function () {
        $(this).attr('oldValue', $(this).val());
    }).keypress(function (e) { // allow pressing enter to validate a setting
        if (e.which == 13) {
            $(this).blur();
        }
    });


    /* progression bar handlers part */

    goToPosition = function (e) {
        var karaInfo = $('#karaInfo');
        var songLength = karaInfo.attr('length');
        var barInnerwidth = karaInfo.innerWidth();
        var futurTimeX = e.pageX - karaInfo.offset().left;
        var presentTimeX = $(progressBarColor).width();
        var futurTimeSec = Math.round(songLength * futurTimeX / barInnerwidth);
        $(progressBarColor).width(100 * futurTimeSec / songLength + "%");
        
        $.ajax({
            url: 'admin/player',
            type: 'PUT',
            data: { command: 'goTo', options: futurTimeSec }
        })
            .done(function (data) {
                refreshCommandStates(setStopUpdate, false);
            });
    }
    $('#karaInfo').click(function (e) {
        refreshCommandStates(goToPosition, e);
    });

    $('#karaInfo').on('mousedown touchstart', function (e) {
        stopUpdate = true;
        mouseDown = true;
        $(progressBarColor).width( e.pageX + "px");
    });
    $('#karaInfo').mouseup(function (e) {
        mouseDown = false;
    });
    $('#karaInfo').mousemove(function (e) {
        if (mouseDown) {
            $(progressBarColor).width( e.pageX + "px");
        }
    });
    $('#karaInfo').mouseout(function (e) {
        if (mouseDown) {
            stopUpdate = false;
            mouseDown = false;
            refreshCommandStates();
        }
    });

    /* password case handlers */

    $('#confirmPassword, #password').on("input", function () {
        if ($('#confirmPassword').val() === $('#password').val() && $('#password').val() !== "") {
            $('#sendPassword').attr('oldvalue', $('#sendPassword').val());
            $('#sendPassword').val($('#confirmPassword').val());
            $('#sendPassword').removeClass('btn-danger').addClass('btn-success');
            $('#sendPassword').prop('disabled', false);
        } else {
            $('#sendPassword').addClass('btn-danger').removeClass('btn-success');
            $('#sendPassword').prop('disabled', true);
        }
    });
    $('#sendPassword').click(function () {
        setSettings($(this), true);
    });

    setStopUpdate = function (stop) {
        stopUpdate = stop;
    }

    $(window).resize(function () {
        //  initSwitchs();
    });

});
