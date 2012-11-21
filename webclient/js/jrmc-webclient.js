requirejs.config({
    //By default load any module IDs from js/lib
    baseUrl: 'js/libs',
    paths: {
        app: '../app'
    }
});

require(["jrmc-ws-client", "jquery", "jquery.mobile.custom.min"], function (JRMC, $) {
    var context = {};
    var log = function (message) {
        console.log(new Date().toLocaleTimeString() + " - " + message);
    };
    var jrmc = new JRMC.Client("client", 'ws://' + remoteServer + '/', log);

    media = function (page, action) {
        $('#popupMediaMenu' + page).popup('close');
        jrmc.media(action, context.libraryCurrentMedia);
    };

    playNow = function (page) {
        media(page, 'play');
    };
    playNext = function (page) {
        media(page, 'play-next');
    };
    playAfter = function (page) {
        media(page, 'play-after');
    };

    changeLibraryPage = function (key, page, name) {
        context.libraryPage = page;
        var newPage = '#library' + page;
        var $page = $(newPage),
            $header = $page.children(":jqmData(role=header)");
        $header.find("h1").html(name);
        $.mobile.changePage(newPage, {transition: 'slide'});
        fetchMedias(key, page);
    };
    popupMediaMenu = function (target, page, media) {
        context.libraryCurrentMedia = media;
        $('#popupMediaMenu' + page).popup('open', {positionTo: target});
    };
    changePlayIcon = function (target) {
        var $control = $('.control-play');
        var current = $control.data('icon');
        if (current != target) {
            $control.data('icon', target);
            $('.control-play .ui-icon').addClass('ui-icon-' + target).removeClass('ui-icon-' + current);
        }
    };
    durationAsText = function (iDuration) {
        var duration = parseFloat(iDuration);
        var seconds = duration % 60;
        var minutes = (duration - seconds) / 60;
        var eDuration = '';
        if (minutes > 60) {
            var hours = Math.floor(minutes / 60);
            minutes = minutes % 60;
            eDuration = hours + ':';
        }
        eDuration = eDuration + ('0' + minutes).substr(-2) + ':' + ('0' + seconds).substr(-2);
        return eDuration;
    };

    refreshPlaylist = function () {
        if (context.currentPageId == '#playlist' && context.currentPlayList) {
            var items = context.currentPlayList;
            var mediaList = $('#playlist-medias');
            mediaList.empty();
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var isCurrentPlayingNow = (i == context.nowPlaying.PlayingNowPosition);
                var content;
                if (isCurrentPlayingNow || !item.cachedHTML) {
                    var $key = item.Key;
                    var $label = item.Name;
                    var $detail = item.ItemType;
                    var $javascript = '', $action = '';
                    var $mode = '';
                    var duration = durationAsText(item.Duration);
                    $mode = ' data-icon="false"';
                    context.playingNowPosition = context.nowPlaying.PlayingNowPosition;
                    if (isCurrentPlayingNow) {
                        $mode = ' data-theme="e"' + $mode;
                    }
                    $detail = '<p> in "' + item.Album + '" by ' + item.Artist + '</p><p class="ui-li-aside"><strong>' + duration + '</strong></p>'
                    content = '<li' + $mode +
                        '><a href="#" onclick="' + $javascript + '">' +
                        '<img src="' + item.ImageURL + '" style="width: 100px"/>' +
                        '<h3>' + $label + '</h3>' + $detail + '</a>' + $action + '</li>'
                    if (!isCurrentPlayingNow) item.cachedHTML = content;
                } else {
                    content = item.cachedHTML;
                }
                mediaList.append(content);
            }
            mediaList.listview("refresh");
        }
    };
    fetchPlaylist = function () {
        $.mobile.showPageLoadingMsg();
        jrmc.fetchPlaylist(function (items) {
            context.currentPlayList = items;
            refreshPlaylist();
            $.mobile.hidePageLoadingMsg();
        })
    };
    fetchMedias = function (key, page) {
        $.mobile.showPageLoadingMsg();
        var mediaList = $('#medias' + page);
        jrmc.fetchItems(key, function (items) {
            var img;
            mediaList.empty();
            for (var i = 0; i < items.length; i++) {
                var item = items[i],
                    $key = item.Key,
                    $label = item.Name,
                    $detail = '',
                    $primaryAction = '',
                    $secondaryLink = '',
                    $mode = '';
                if (item.ItemType == 'Media') {
                    $mode = ' data-icon="false"';
                    $primaryAction = 'popupMediaMenu(this,' + page + ', {file:' + $key + '})';
                    $detail = '<p> in "' + item.Album + '" by ' + item.Artist + '</p><p class="ui-li-aside"><strong>' + durationAsText(item.Duration) + '</strong></p>'
                } else {
                    $primaryAction = 'changeLibraryPage(' + $key + ', ' + (page + 1) + ',\'' + $label + '\')';
                    var $secondaryAction = 'popupMediaMenu(this,' + page + ', {folder:' + $key + '})';
                    $secondaryLink = '<a href="#" data-icon="gear" data-rel="popup" onclick="' + $secondaryAction + '">Add</a>';
                }
                mediaList.append('<li' + $mode + '><a href="#" onclick="' + $primaryAction + '">' +
                    '<img src="' + item.ImageURL + '" style="width: 100px"/>' +
                    '<h3>' + $label + '</h3>' + $detail + '</a>' + $secondaryLink + '</li>');
            }
            mediaList.listview("refresh");
            $.mobile.hidePageLoadingMsg();
        })
    };
    var updateNowPlaying = function (zoneInfo) {
        context.nowPlaying = zoneInfo;
        if (zoneInfo.MediaHasChanged) {
            var imageURL = zoneInfo.ImageURL;
            $('#cover').attr('src', imageURL);
            $('.np-cover').attr('src', imageURL);
            $('#title').val(zoneInfo.Name);
            $('#track-pos').val(zoneInfo.PlayingNowPositionDisplay);
            $('#artist').val(zoneInfo.Artist);
            $('#album').val(zoneInfo.Album);
            refreshPlaylist();
        }
        //log(JSON.stringify(zoneInfo));
        $('#position').val(zoneInfo.PositionDisplay);
        $('#position-slide').val(zoneInfo.RelativePosition);
        $('#position-slide').slider('refresh');

        $('.np-description').text(zoneInfo.Name + ' in "' + zoneInfo.Album + '" by ' + zoneInfo.Artist);
        $('.np-position').text(zoneInfo.PositionDisplay);
        if (zoneInfo.Status == 'Playing') {
            changePlayIcon('pause');
        } else {
            changePlayIcon('play');
        }
        //log($('#playlist-medias li')[zoneInfo.PlayingNowPosition]);
    };

    $(document).ready(function () {
        var menuShown;
        var popupMenu = $("#main-menu");

        function hideMainMenu() {
            popupMenu.css('z-index', -1);
            menuShown = false;
        }

        function showMainMenu() {
            popupMenu.css('z-index', 100);
            menuShown = true;
        }

//        $('div[data-role=popup]').popup();
        $(".control-play").live('click', jrmc.play());
        $(".control-stop").live('click', jrmc.stop());
        $(".control-next").live('click', jrmc.next());
        $(".control-previous").live('click', jrmc.previous());

        $("a.showMenu").click(function () {
            if (menuShown != true) {
                showMainMenu();
            } else {
                hideMainMenu()
            }
        });

        $("#menu li a").click(function () {
            var p = $(this).parent();
            if ($(p).hasClass('active')) {
                $("#menu li").removeClass('active');
            } else {
                $("#menu li").removeClass('active');
                $(p).addClass('active');
            }
        });
        $('.ui-btn-back').live('click', function () {
            history.back();
            return false;
        });
        $(document).bind("pagebeforechange", function (e, data) {
            hideMainMenu();
            var destination = ($.mobile.path.parseUrl(data.toPage)).hash;
            if (destination != undefined) context.currentPageId = destination;
            if (destination == '#library0') {
                fetchMedias(0, 0);
            }
            if (destination == '#playlist') {
                fetchPlaylist();
            }
        });
        jrmc.watchZone(-1, updateNowPlaying);
    });
});