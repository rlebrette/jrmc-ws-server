//var host = '192.168.1.100';
var host = 'rlb-work';

requirejs.config({
    //By default load any module IDs from js/lib
    baseUrl: 'js/libs',
    paths: {
        app: '../app'
    }
});

require(["jrmc-ws-client", "jquery", "jquery.mobile.custom.min"], function (JRMC, $, jqm) {
    var log = function (message) {
        console.log(new Date().toLocaleTimeString() + " - " + message);
    };
    var jrmc = new JRMC.Client("client", 'ws://' + host + ':1337/', log);

    changeLibraryPage = function (key, page, name) {
        var newPage = '#library' + page;
        var $page = $(newPage),
            $header = $page.children(":jqmData(role=header)");
        $header.find("h1").html(name);
        $.mobile.changePage(newPage, {transition: 'slide'});
        fetchMedias(key, page);
    };
    fetchMedias = function (key, page) {
        $.mobile.showPageLoadingMsg();
        jrmc.fetchItems(key, function (response) {
            var img;
            var items = response.Items;
            log(JSON.stringify(items));
            var mediaList = $('#medias' + page);
            mediaList.empty();
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var $key = item.Key;
                var $label = item.Name;
                var $detail = item.ItemType;
                var $javascript = '', $action = '';
                var $mode = '';
                if ($detail == 'Media') {
                    var duration = parseFloat(item.Duration);
                    var minutes = Math.floor(duration / 60);
                    var seconds = duration - (minutes * 60);
                    if (minutes > 60) {
                        var hours;
                        hours = Math.floor(minutes / 60);
                        minutes = minutes % 60;
                        duration = hours + ':' + minutes + ':' + seconds;
                    } else {
                        duration = minutes + ':' + seconds;
                    }
                    $mode = ' data-icon="false"';
                    $detail = '<p> in "' + item.Album + '" by ' + item.Artist + '</p><p class="ui-li-aside"><strong>' + duration + '</strong></p>'
                } else {
                    $detail = '';
                    $javascript = 'changeLibraryPage(' + $key + ', ' + (page + 1) + ',\'' + $label + '\')';
                    $action = '<a href="#popupMenu" data-icon="gear" data-rel="popup">Add</a>';
                }
                mediaList.append('<li' + $mode +
                    '><a href="#" onclick="' + $javascript + '">' +
                    '<img src="' + item.ImageURL + '" style="width: 100px"/>' +
                    '<h3>' + $label + '</h3>' + $detail + '</a>' + $action + '</li>');
            }
            mediaList.listview("refresh");
            $.mobile.hidePageLoadingMsg();
        })
    };
    var updateNowPlaying = function (zoneInfo) {
        log(JSON.stringify(zoneInfo));
        $('#title').val(zoneInfo.Name);
        $('#track-pos').val(zoneInfo.PlayingNowPositionDisplay);
        $('#artist').val(zoneInfo.Artist);
        $('#album').val(zoneInfo.Album);
        $('#position').val(zoneInfo.PositionDisplay);
        $('#position-slide').val(zoneInfo.RelativePosition);
        $('#position-slide').slider('refresh');

        $('.np-description').text(zoneInfo.Name + ' in "' + zoneInfo.Album + '" by ' + zoneInfo.Artist);
        $('.np-position').text(zoneInfo.PositionDisplay);
        if (zoneInfo.MediaHasChanged) {
            var imageURL = zoneInfo.ImageURL;
            $('#cover').attr('src', imageURL);
            $('.np-cover').attr('src', imageURL);
        }
    };

    $(document).ready(function () {
        var menuShown;
        var popupMenu = $("#main-menu");
        function hidePopupMenu() {
            popupMenu.css('z-index', -1);
            menuShown = false;
        }
        function showPopupMenu() {
            popupMenu.css('z-index', 100);
            menuShown = true;
        }

        $(".control-play").live('click', jrmc.play());
        $(".control-stop").live('click', jrmc.stop());
        $(".control-next").live('click', jrmc.next());
        $(".control-previous").live('click', jrmc.previous());

        $("a.showMenu").click(function () {
            if (menuShown != true) {
                showPopupMenu();
            } else {
                hidePopupMenu()
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
            hidePopupMenu();
            var destination = $.mobile.path.parseUrl(data.toPage);
            if (destination.hash == '#library0') {
                fetchMedias(0, 0);
            }
        });
        jrmc.watchZone(-1, updateNowPlaying);
    });
});

/*
 jrmc.fetch('Playback/Zones', null, function (data) {
 log("ZONES");
 log(JSON.stringify(data));
 });
 setTimeout(function () {
 fetchMedias(0);
 }, 2000);
 */
