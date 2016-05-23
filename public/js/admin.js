$(function(){
  // 端末本登録イベント
  $('#device_list td.register button.btn-ng').on('click', function(){
    var uuid = $(this).data('uuid');
    if (uuid == undefined || uuid.length == 0) return;
    $.post({
      url: '/admin/devices/' + uuid + '/registered',
      cache: false
    }).done(function(data){
      location.reload();
      console.log('success');
    }).fail(function(data){
      console.log('error');
    });
  });

  // 端末有効化イベント
  $('#device_list td.status button.btn-ng').on('click', function(){
    var uuid = $(this).data('uuid');
    if (uuid == undefined || uuid.length == 0) return;
    $.post({
      url: '/admin/devices/' + uuid + '/enabled',
      cache: false
    }).done(function(data){
      location.reload();
      console.log('success');
    }).fail(function(data){
      console.log('error');
    });
  });

  // 端末無効化イベント
  $('#device_list td.status button.btn-ok').on('click', function(){
    var uuid = $(this).data('uuid');
    if (uuid == undefined || uuid.length == 0) return;
    $.post({
      url: '/admin/devices/' + uuid + '/disabled',
      cache: false
    }).done(function(data){
      location.reload();
      console.log('success');
    }).fail(function(data){
      console.log('error');
    });
  });

  //次へボタン
  $('#btn-next').on('click', function(){
    if (($(this).data('show')%5) == 0) {
      var num = Math.floor($(this).data('show')/5)*5+1
    } else {
      var num = Math.floor(($(this).data('show')+5)/5)*5+1
    }
    console.log(num);
    if (num < $(this).data('page')) {
      if ($(this).data('register') == 'registered') {
        location.href = '/admin/devices?page='+num;
      } else {
        location.href = '/admin/devices/non_registered?page='+num;
      }
    }
  });

  //前へボタン
  $('#btn-back').on('click', function(){
    if ((($(this).data('show'))%5) == 0) {
      var num = Math.floor(($(this).data('show'))/5)*5-9
    } else {
      var num = Math.floor(($(this).data('show')-5)/5)*5+1
    }
    console.log(num);
    if (num >= 1) {
      if ($(this).data('register') == 'registered') {
        location.href = '/admin/devices?page='+num;
      } else {
        location.href = '/admin/devices/non_registered?page='+num;
      }
    }
  });
});
function getQuerystring(key, default_){
   if (default_==null) default_="";
   key = key.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
   var regex = new RegExp("[\\?&]"+key+"=([^&#]*)");
   var qs = regex.exec(window.location.href);
   if(qs == null)
    return default_;
   else
    return qs[1];
}
