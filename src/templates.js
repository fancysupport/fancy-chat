FancyChat.templates = {};
FancyChat["templates"]["chat"] = function anonymous(it) {
var out='<div id="fancy-messages"></div><div class="send"><div class="message"><textarea id="fancy-message" placeholder="batman"></textarea></div><button id="fancy-send">Send</button></div>';return out;
};
FancyChat["templates"]["convos"] = function anonymous(it) {
var out='<div id="fancy-convos">';var arr1=it;if(arr1){var v,k=-1,l1=arr1.length-1;while(k<l1){v=arr1[k+=1];out+='<div class="convo" data-id="'+( k )+'">'+( v.content )+'</div>';} } out+='<button id="fancy-new">New</button></div>';return out;
};
FancyChat["templates"]["header"] = function anonymous(it) {
var out='<span>'+( it.title )+'</span><a id="fancy-'+( it.which )+'">'+( it.which )+'</a><a id="fancy-close">X</a>';return out;
};
FancyChat["templates"]["messages"] = function anonymous(it) {
var out=''; var prev = it.direction; out+='<div class="'+( it.direction )+'"><p class="message">'+( it.content )+'</p>';var arr1=it.replies;if(arr1){var m,i1=-1,l1=arr1.length-1;while(i1<l1){m=arr1[i1+=1];if(m.direction === prev){out+='<p class="message">'+( m.content )+'</p>';}else{out+='</div><div class="'+( m.direction )+'"><p class="message">'+( m.content )+'</p>';} prev = m.direction; } } out+='</div>';return out;
};
FancyChat["templates"]["widget"] = function anonymous(it) {
var out='<div id="fancy-chat"><div class="header"></div><div class="body"><div class="chat"></div><div class="convos"></div></div></div>';return out;
};