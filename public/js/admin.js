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
});
