var host = '192.168.1.100';
//var host = 'rlb-work';

requirejs.config({
    //By default load any module IDs from js/lib
    baseUrl: 'js/libs',
    paths: {
        app: '../app'
    }
});

require(["jrmc-ws-client", "jquery", "jquery.mobile.custom.min"], function (JRMC, $, _) {
    var log = function (message) {
        console.log(new Date().toLocaleTimeString() + " - " + message);
    };
    var jrmc = new JRMC.Client("client", 'ws://' + host + ':1337/', log);

    changeLibraryPage = function (key, page, name) {
        var newPage = '#library' + page;
        var $page = $(newPage),
        // Get the header for the page.
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
                var key = item.Key;
                var label = item.Name;
                var detail = item.ItemType;
                if (detail == 'Media') {
                    var duration = parseFloat(item.Duration);
                    var minutes = Math.round(duration / 60);
                    var seconds = Math.round((duration - (minutes * 60)) / 60);
                    duration = minutes + ':' + seconds;
                    detail = '<p> in "' + item.Album + '" by ' + item.Artist + '</p><p class="ui-li-aside"><strong>' + duration + '</strong></p>'
                    img = "http://localhost:52199/MCWS/v1/File/GetImage?Format=png&File=" + key;
                } else {
                    detail = '';
                    img = "http://localhost:52199/MCWS/v1/Browse/Image?Format=png&ID=" + key;
                }

                mediaList.append('<li><a href="#" onclick="changeLibraryPage(' + key + ',\'' + page + '_l\',\''+ label +'\')"><img src="' + img + '" style="width: 100px"/><h3>' + label + '</h3>' + detail + '</a><a href="#">Add</a></li>');
            }
            mediaList.listview("refresh");
            $.mobile.hidePageLoadingMsg();
        })
    };
    var updateNowPlaying = function (zoneInfo, context) {
        log(JSON.stringify(zoneInfo));
        if (zoneInfo.hasOwnProperty('Name')) {
            var name = zoneInfo.Name;
            if (context.CurrentSongTitle != name) {
                context.CurrentSongTitle = name;
                $('#title').val(name);
                $('#track-pos').val(zoneInfo.PlayingNowPositionDisplay);
                if (zoneInfo.hasOwnProperty('Album')) {
                    $('#artist').val(zoneInfo.Artist);
                    var album = $('#album');
                    var currentAlbum = album.val();
                    if (currentAlbum != zoneInfo.Album) {
                        album.val(zoneInfo.Album);
                        var imageURL = 'http://' + host + ':52199/' + zoneInfo.ImageURL;
                        $('#cover').attr('src', imageURL);
                        $('.cover').attr('src', imageURL);
                    }
                }
            }
        }
        if (zoneInfo.hasOwnProperty('DurationMS')) {
            context.CurrentDurationMS = zoneInfo.DurationMS;
        }
        if (zoneInfo.hasOwnProperty('PositionMS')) {
            var currentPosition = parseInt(zoneInfo.PositionMS);
            if (currentPosition < 0) currentPosition = 0;
            var pos = Math.round((currentPosition / parseInt(context.CurrentDurationMS)) * 10000);
            $('#position').val(zoneInfo.PositionDisplay);
            $('#position-slide').val(pos);
            $('#position-slide').slider('refresh');
            log(pos);
        }
    };

    $(document).ready(function () {
        var menuShown;

        $("a.showMenu").click(function () {
            if (menuShown != true) {
                $("#menu").css('z-index', 10)
                menuShown = true;
            } else {
                $("#menu").css('z-index', -1)
                menuShown = false;
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
            $("#menu").css('z-index', -1);
            menuShown = false;
        });
        $('.ui-btn-back').live('tap',function () {
            history.back();
            return false;
        }).live('click', function () {
                return false;
            });
        $(document).bind("pagebeforechange", function (e, data) {
            var destination = $.mobile.path.parseUrl(data.toPage);
            if (destination.hash == '#library') {
                fetchMedias(0, '');
            }
        });
        jrmc.watchZone(-1, updateNowPlaying);
        jrmc.onZoneUpdate(updateNowPlaying);
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
