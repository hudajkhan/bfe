/*
function bfe() {}

bfe.prototype.editor = function(id) {
    div = document.getElementById(id);
    div.innerHTML = "Hello there";
}

var bfe = new bfe();
*/

define(function(require, exports, module) {
    require("jquery");
    require("json");
    require("underscore");
    require("bootstrapjs");
    
    var editorconfig = {};
    var store = [];
    var profiles = [];
    var resourceTemplates = [];
    var startingPoints = [];
    var formTemplates = [];
    
    exports.setConfig = function(config) {
        editorconfig = config;
        var files = [];
        for (var i=0; i < config.profiles.length; i++) {
            files[i] = "json!static/profiles/" + config.profiles[i] + ".json";
            file = "static/profiles/" + config.profiles[i] + ".json";
            $.ajax({
                type: "GET",
                dataType: "json",
                async: false,
                url: file,
                success: function(data) {
                    profiles.push(data);
                    for (var rt=0; rt < data.Profile.resourceTemplates.length; rt++) {
                        resourceTemplates.push(data.Profile.resourceTemplates[rt]);
                    }
                }
            });
        }
        
        editorconfig.baseURI = "http://example.org/";
        //require([files], function(){
        //    console.log(JSON.stringify(json));
        //    return {};
        //});

        //    var p = "json!static/profiles/" + config.profiles[i] + ".json";
            //profiles[i] = require([p]);
            //require([p], function(json){
            //    profiles[i] = json; 
            //    console.log(JSON.stringify(json));
            //    return {};
            //});
            //var p = "static/profiles/" + config.profiles[i] + ".json";
            //$.getJSON(p, function( data ) {
            //    profiles[i] = data; 
            //});
    }
    
    exports.editor = function (config, id) {

        this.setConfig(config);
        
        div = document.getElementById(id);
        
        var menudiv = $('<div>', {id: "bfeditor-menudiv", class: "col-md-2 sidebar"});
        var menuul = $('<ul>', {id: "bfeditor-menuul", class: "nav nav-sidebar"});
        for (var i=0; i < config.startingPoints.length; i++) {
            var li = $('<li>');
            var a = $('<a>', {href: "#", id: "sp-" + i});
            a.html(config.startingPoints[i].label);
            $(a).click(function(){
                loadForm(this.id);
            });
            li = li.append(a);
            menuul.append(li);
            startingPoints[i] = config.startingPoints[i];
        }
        menudiv.append(menuul);
        
        var formdiv = $('<div>', {id: "bfeditor-formdiv", class: "col-md-8"});
        
        var optiondiv = $('<div>', {id: "bfeditor-optiondiv", class: "col-md-2"});
        
        var rowdiv = $('<div>', {class: "row"});
        
        rowdiv.append(menudiv);
        rowdiv.append(formdiv);
        rowdiv.append(optiondiv);

        $(div).append(rowdiv);
        
        var debugdiv = $('<div>', {class: "col-md-12"});
        debugdiv.html("Debug output");
        var debugpre = $('<pre>', {id: "bfeditor-debug"});
        debugdiv.append(debugpre);
        $(div).append(debugdiv);
        debugpre.html(JSON.stringify(profiles, undefined, " "));
        
        return {
            "profiles": profiles,
            "div": div
        };
    };
    
    function loadForm (spid) {
        store = [];
        spnum = parseInt(spid.replace('sp-', ''));
        spoints = editorconfig.startingPoints[spnum];
        var rts = [];
        var rtsids = [];
        for (var urt=0; urt < spoints.useResourceTemplates.length; urt++) {
            var urtid = spoints.useResourceTemplates[urt];
            
            var rt = _.where(resourceTemplates, {"id": urtid})
            if ( rt !== undefined ) {
                rts.push(rt[0]);
                rtsids.push(rt[0].id);
            }
        }
        /*
            [
                {
                    guid,
                    s [uri=string],
                    p [uri=string],
                    o [multi=object] {
                        id=uri [string]
                        datatype=datatype [string]
                        lang=lang [string]
                        value=value [string]
                    }
                }
                
                
                {
                    guid,
                    s [uri=string],
                    p [uri=string],
                    o [string],
                    otype [string=uri,datatype,literal],
                    olang [string],
                    odatatype [string],
                }
            
            ]
        */
        rts.forEach(function(rt) {
            var id = guid();
            var uri = editorconfig.baseURI + id;
            var triple = {}
            triple.guid = id;
            triple.rtID = rt.id;
            triple.s = uri;
            triple.p = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
            triple.o = rt.resourceURI;
            triple.otype = "uri";
            store.push(triple);
            rt.guid = id;
            
            rt.propertyTemplates.forEach(function(property) {
                property.guid = guid();
                property.display = "true";
                if (_.has(property, "valueConstraint")) {
                    if (_.has(property.valueConstraint, "valueTemplateRefs")) {
                        vtRefs = property.valueConstraint.valueTemplateRefs;
                        for ( var v=0; v < vtRefs.length; v++) {
                            var vtrs = vtRefs[v];
                            if ( rtsids.indexOf(vtrs) > -1 && vtrs != rt.id ) {
                                relatedTemplates = _.where(store, {rtID: vtrs});
                                triple = {}
                                triple.guid = guid();
                                triple.s = uri;
                                triple.p = property.propertyURI;
                                triple.o = relatedTemplates[0].s;
                                triple.otype = "uri";
                                store.push(triple);
                                property.display = "false";
                            }
                        }
                    }
                }
            });
        });
        formTemplates = rts;
        
        // Let's create the form
        var form = $('<form>', {id: "bfeditor-form", class: "form-horizontal", role: "form"});
        formTemplates.forEach(function(rt) {
            var resourcediv = $('<div>', {id: rt.guid});
            rt.propertyTemplates.forEach(function(property) {
                
                var formgroup = $('<div>', {class: "form-group"});
                var label = $('<label for="' + property.guid + '" class="col-sm-3 control-label">' + property.propertyLabel + '</label>');
                var saves = $('<div class="form-group"><div class="col-sm-3"></div><div class="col-sm-8"><div class="btn-toolbar" role="toolbar"></div></div></div>');
                
                if (property.type == "literal") {
                    
                    var input = $('<div class="col-sm-8"><input type="email" class="form-control" id="' + property.guid + '" placeholder="' + property.propertyLabel + '"></div>');
                    
                    button = $('<button type="button" class="btn btn-default">Set</button>');
                    $(button).click(function(){
                        setLiteral(rt.guid, property.guid);
                    });
                    
                    formgroup.append(label);
                    formgroup.append(input);
                    formgroup.append(button);
                    formgroup.append(saves);
                }
                
                if (property.type == "resource") {
                    
                    if (_.has(property, "valueConstraint")) {
                        if (_.has(property.valueConstraint, "valueTemplateRefs")) {
                            /*
                            *  The below gives you a form like Z produced.   Keep for time being.
                            */
                            /*
                            button = $('<div class="btn-group"><button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button></div>');
                            ul = $('<ul class="dropdown-menu" role="menu"></ul>');
                            vtRefs = property.valueConstraint.valueTemplateRefs;
                            for ( var v=0; v < vtRefs.length; v++) {
                                var vtrs = vtRefs[v];
                                valueTemplates = _.where(resourceTemplates, {"id": vtrs});
                                if (valueTemplates[0] !== undefined) {
                                    li = $('<li></li>');
                                    a = $('<a href="#">' + valueTemplates[0].resourceLabel + '</a>');
                                    $(a).click(function(){
                                        openModal(rt.guid, property.guid, valueTemplates[0]);
                                    });
                                    li.append(a);
                                    ul.append(li);
                                }
                            }
                            button.append(ul);
                            */
                            buttondiv = $('<div class="col-sm-8" id="' + property.guid +'"></div>');
                            button = $('<div class="btn-group btn-group-sm"></div>');
                            buttondiv.append(button);
                            vtRefs = property.valueConstraint.valueTemplateRefs;
                            for ( var v=0; v < vtRefs.length; v++) {
                                var vtrs = vtRefs[v];
                                valueTemplates = _.where(resourceTemplates, {"id": vtrs});
                                if (valueTemplates[0] !== undefined) {
                                    b = $('<button type="button" class="btn btn-default">' + valueTemplates[0].resourceLabel + '</button>');
                                    $(b).click(function(){
                                        openModal(rt.guid, property.guid, valueTemplates[0]);
                                    });
                                    button.append(b);
                                }
                            }
                            
                            formgroup.append(label);
                            formgroup.append(buttondiv);
                            formgroup.append(saves);
                    
                        }
                        
                    }

                }
                
                resourcediv.append(formgroup);
            });
            form.append(resourcediv);
        });
        $("#bfeditor-formdiv").html("");
        $("#bfeditor-formdiv").append(form);
        
        formTemplates.forEach(function(rt) {
            rt.propertyTemplates.forEach(function(property) {
                if (_.has(property, "valueConstraint")) {
                    if (_.has(property.valueConstraint, "defaultURI")) {
                        data = property.valueConstraint.defaultURI;
                        // set the triple
                        var triple = {}
                        triple.guid = guid();
                        console.log("data is " + data);
                        console.log("tguid " + triple.guid);
                        triple.s = editorconfig.baseURI + rt.guid;
                        triple.p = property.propertyURI;
                        triple.o = data;
                        triple.otype = "uri";
                        store.push(triple);
                        
                            // set the form
                        var formgroup = $("#" + property.guid).closest(".form-group");
                        var save = $(formgroup).find(".btn-toolbar")[0];
                    
                        var buttongroup = $('<div>', {id: triple.guid, class: "btn-group btn-group-xs"});
                        console.log("tguid for div id " + triple.guid);
                        var display = "";
                        if (_.has(property.valueConstraint, "defaultLiteral")) {
                            display = property.valueConstraint.defaultLiteral;
                        }
                        if (display.length > 10) {
                            display = display.substr(0,10) + "...";
                        } else if (display === "") {
                            display = data.substr(0,10) + "...";
                        }
                        var displaybutton = $('<button type="button" class="btn btn-default">' + display +'</button>');
                        var delbutton = $('<button type="button" class="btn btn-danger">x</button>');
                        $(delbutton).click(function(){
                            removeTriple(property.guid, triple);
                        });
                        console.log("triple " + JSON.stringify(triple));
                    
                        buttongroup.append(displaybutton);
                        buttongroup.append(delbutton);
                    
                        $(save).append(buttongroup);
                        
                    }
                }
            });
        });
        
        $("#bfeditor-debug").html(JSON.stringify(store, undefined, " "));
    }
    
    function setLiteral(resourceID, forminputID) {
        var data = $("#" + forminputID).val();
        if (data !== "") {
            var triple = {}
            triple.guid = guid();
            triple.s = editorconfig.baseURI + resourceID;
            formTemplates.forEach(function(t) {
                var properties = _.where(t.propertyTemplates, {"guid": forminputID})
                if ( properties[0] !== undefined ) {
                    triple.p = properties[0].propertyURI;
                    triple.o = data;
                    triple.otype = "literal";
                    triple.olang = "en";
                    
                    store.push(triple);
                    
                    var formgroup = $("#" + forminputID).closest(".form-group");
                    var save = $(formgroup).find(".btn-toolbar")[0];
                    
                    var buttongroup = $('<div>', {id: triple.guid, class: "btn-group btn-group-xs"});
                    if (data.length > 10) {
                        display = data.substr(0,10) + "...";
                    } else {
                        display = data;
                    }
                    var displaybutton = $('<button type="button" class="btn btn-default">' + display +'</button>');
                    var delbutton = $('<button type="button" class="btn btn-danger">x</button>');
                    $(delbutton).click(function(){
                        removeTriple(forminputID, triple);
                    });
                    
                    buttongroup.append(displaybutton);
                    buttongroup.append(delbutton);
                    
                    $(save).append(buttongroup);
                    $("#" + forminputID).val("");
                    if (properties[0].repeatable !== undefined && properties[0].repeatable == "false") {
                        $("#" + forminputID).attr("disabled", true);
                    }
                    
                }
            });
        }
        $("#bfeditor-debug").html(JSON.stringify(store, undefined, " "));
    }
    
    function removeTriple(forminputID, t) {
        console.log("removing triple: " + t.guid);
        console.log($("#" + t.guid).attr("class"));
        $("#" + t.guid).empty();
        $("#" + forminputID).attr("disabled", false);
        store = _.without(store, _.findWhere(store, {guid: t.guid}));
        $("#bfeditor-debug").html(JSON.stringify(store, undefined, " "));
    }
    
    /**
    * Generates a GUID string.
    * @returns {String} The generated GUID.
    * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
    * @author Slavik Meltser (slavik@meltser.info).
    * @link http://slavik.meltser.info/?p=142
    */
    function guid() {
        function _p8(s) {
            var p = (Math.random().toString(16)+"000000000").substr(2,8);
            return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
        }
        return _p8() + _p8(true) + _p8(true) + _p8();
    }

    
});