$(document).ready(function() {
    var loaded;
    loaded = setInterval(loadDash, 500);

    function loadDash() {
        $.get('/api/status/', function(data) {
            if (data.dashReady) {
                $('.page-speed').html(data.dashboardData.speed_score);
                $('.image-bytes').html(data.dashboardData.image_bytes);
                $('.resources').html(data.dashboardData.http_resources);
                $('.roundtrips').html(data.dashboardData.roundtrips);
                $('.request-bytes').html(data.dashboardData.request_bytes);

                if (data.uninstalled) {
                    clearInterval(loaded);
                    $(".page-loader-wrapper").hide();
                    $(".mobile-loader").show();
                    $(".mobile-screenshot").hide();
                    $(".dropthemizing-text").hide();
                    $(".dropthemizer-complete").hide();
                    getScreenshot();
                } else {
                    if (data.isPayed === true) {
                        if (data.optimized) {
                            clearInterval(loaded);
                            $(".page-loader-wrapper").hide();
                            $(".dropthemizer-setup").hide();
                            $(".dropthemizing-text").hide();
                            $(".dropthemizer-complete").show();
                            getScreenshot();
                        } else {
                            clearInterval(loaded);
                            $(".page-loader-wrapper").hide();
                            $(".dropthemizing-text").show();
                            $(".mobile-loader").show();
                            $(".dropthemizer-setup").hide();
                            $(".mobile-screenshot").hide();
                            $(".dropthemizer-complete").hide();
                            poll();
                            setTimeout(function() {
                                $('.wait-text').css('visibility', 'visible');
                            }, 7000);
                        }
                    } else {
                        clearInterval(loaded);
                        $(".page-loader-wrapper").hide();
                        $(".mobile-loader").show();
                        $(".mobile-screenshot").hide();
                        $(".dropthemizing-text").hide();
                        $(".dropthemizer-complete").hide();
                        getScreenshot();
                    }
                }

            }
        });
    }

    function getScreenshot() {
        var timer = setInterval(screenshotPayload, 3000);

        function screenshotPayload() {
            $.get('/api/screenshot/', function(data) {
                if (data) {
                    clearInterval(timer);
                    var img = document.createElement('img');
                    img.src = 'data:image/png;base64,' + data;
                    $('.mobile-screenshot').append(img);
                    $('.mobile-loader').hide();
                    $('.mobile-screenshot').show();
                }
            });
        } //END Payload

        setTimeout(function() {
            clearInterval(timer);
            var img = document.createElement('img');
            img.src = '/Images/image.png';
            $('.mobile-screenshot').append(img);
            $('.mobile-loader').hide();
            $('.mobile-screenshot').show();
        }, 60000);
    }

    function poll() {
        var timer = setInterval(finishedDropthemizing, 5000);

        function finishedDropthemizing() {
            $.get('/api/status/', function(data) {
                if (data.optimized === true) {
                    clearInterval(timer);
                    location.reload(true);
                }
            });
        }
    }

    $('#openModal').click(function(e) {
        e.preventDefault();
        $('#myModal').css("display", "block");
    });

    $('.dropthemizer-close').click(function() {
        $('#myModal').css("display", "none");
    });

    $('#dropthemizer-sdbtn').click(function(e) {
        e.preventDefault();
        window.open('https://search.google.com/structured-data/testing-tool');
    });

    // When the user clicks anywhere outside of the modal, close it
    var modal = document.getElementById('myModal');
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    $('#support-link').click(function(e) {
        e.preventDefault();
        Tawk_API.maximize();
    });

});