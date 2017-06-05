   $(function () {
       // var saved_id = localStorage.getItem('saved-item');
       // if (saved_id != null && saved_id != undefined) {
       //     $('.page-content .row').hide();
       //     $('.page-content .' + saved_id).show();
       //     $('#' + saved_id).addClass('active');
       // } else {
       $('.page-content .row').hide();
       $('#Authentication').addClass('active');
       $('.page-content .Authentication').show();
       // }

       $('a').click(function () {
           console.log('click');
           var id = $(this).attr('id');
           $('a').removeClass('active');
           $(this).addClass('active');

           $('.page-content .row').hide();
           $('.page-content .' + id).show();
           // localStorage.setItem('saved-item', id);
       });

       $('#af-analysis').click(
           function () {
               var url = 'https://a4nc4fz9yj.execute-api.ap-northeast-1.amazonaws.com/prov';
               //var url = 'https://api.calm-health.com/prov';

               $.ajax({
                   type: "POST",
                   url: url,
                   data: JSON.stringify({
                       "ecg": [1936, 2020, 0, 0, 0, 0, 0, 1950, 1922, 1880, 1922, 1880,
                           1936, 1936, 2020, 1964, 1950, 1936, 1950, 1894, 1894,
                           1894, 1894, 1922, 1950, 1964, 1950, 1922, 1894, 1880,
                           1880
                       ]
                   }),
                   contentType: "application/json",
                   success: function (data) {
                       alert(JSON.stringify(data, null, 2));
                   },
                   failure: function (e) {
                       alert(e);
                   }
               });
           });

   });