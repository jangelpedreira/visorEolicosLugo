///////////////////////////////////////////////////////////////////////////
// Copyright © Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
define(['dojo/_base/declare', 'jimu/BaseWidget',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/symbols/SimpleLineSymbol',
  'esri/symbols/SimpleFillSymbol',
  'esri/graphicsUtils',
  'esri/layers/FeatureLayer',
  'esri/renderers/SimpleRenderer',
  'esri/tasks/query',
  'esri/tasks/QueryTask',
  'esri/tasks/GeometryService',
  'esri/tasks/BufferParameters',
  'esri/layers/GraphicsLayer',
  'esri/config',
  'dojo/_base/lang',
  'dojo/dom',
  'dojo/dom-construct',
  "dojo/dom-class",
  'dojo/_base/array',
  'esri/Color',
  'bootstrap/Dropdown',
  'bootstrap/Tab',
  'bootstrap/Modal',
],
  function (declare, BaseWidget, SimpleMarkerSymbol, SimpleLineSymbol,
    SimpleFillSymbol, graphicsUtils, FeatureLayer, SimpleRenderer,
    Query, QueryTask, GeometryService, BufferParameters, GraphicsLayer, esriConfig,
    lang, dom, domConstruct, domClass, array, Color) {

    var featureLayerAfeccionAnterior = null;
    var numInfraestructurasPrevias = 0;
    var outFieldsInfraestructuras = new Array("num_exped", "nome", "nome_abrev");
    var outFieldsAfecciones = new Array("num_exped", "categoria", "tipo", "nome", "capa", "campo_id", "valor_id", "capa_id");
    var graphicsAfeccionesAnteriores = new GraphicsLayer();


    var urlLayerParques = "https://services9.arcgis.com/FeolmdInvkatU1tZ/ArcGIS/rest/services/Infraestructuras_eolicas_ArcGIS_Online/FeatureServer/7";
    var urlLayerLinas = "https://services9.arcgis.com/FeolmdInvkatU1tZ/ArcGIS/rest/services/Infraestructuras_eolicas_ArcGIS_Online/FeatureServer/2";
    var urlTableAfeccionesNaturales = "https://services9.arcgis.com/FeolmdInvkatU1tZ/ArcGIS/rest/services/Infraestructuras_eolicas_ArcGIS_Online/FeatureServer/31";
    var urlGeometryService = "https://utility.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer";
    var urlServicioMapa = "https://services9.arcgis.com/FeolmdInvkatU1tZ/ArcGIS/rest/services/Infraestructuras_eolicas_ArcGIS_Online/FeatureServer/";

    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // Custom widget code goes here

      baseClass: 'jimu-widget-showNaturalAffections',

      _mapClickHandler: null, // Map click handler

      //this property is set by the framework when widget is loaded.
      name: 'showNaturalAffections',
      symbol: null,

      /**
      * This function will disconnects the map events
      * @memberOf widgets/ShowNaturalAfections/Widget
      **/
      _disconnectMapEventHandler: function () {
        console.log("-- IN _disconnectMapEventHandler");
        this._enableWebMapPopup();

        if (this._mapClickHandler) {
          this._mapClickHandler.remove();
          this._mapClickHandler = null;
        }
        console.log("-- OUT _disconnectMapEventHandler");
      },

      /**
      * This function will connects the map event
      * @memberOf widgets/NearMe/Widget
      **/
      _connectMapEventHandler: function () {
        console.log("-- IN _connectMapEventHandler");
        if (!this._mapClickHandler) {
          this._disableWebMapPopup();
          //handle map click
          this._mapClickHandler = this.own(this.map.on("click", lang.hitch(this, this._onMapClick)))[0];
        }
        console.log("-- OUT _connectMapEventHandler");
      },

      /**
     * This function will enable the web map popup.
     * @memberOf widgets/NearMe/Widget
     **/
      _enableWebMapPopup: function () {
        console.log("-- IN _enableWebMapPopup");
        if (this.map) {
          this.map.setInfoWindowOnClick(true);
        }
        console.log("-- OUT _enableWebMapPopup");
      },

      /**
      * This function will disable the web map popup.
      * @memberOf widgets/NearMe/Widget
      **/
      _disableWebMapPopup: function () {
        console.log("--IN _disableWebMapPopup");
        if (this.map) {
          this.map.setInfoWindowOnClick(false);
        }
        console.log("--OUT _disableWebMapPopup");
      },

      /**
      * On map click init the workflow, and reverse geocode the address
      * to show in infowindow at the selected location.
      * @memberOf widgets/NearMe/Widget
      **/
      _onMapClick: function (evt) {
        console.log("--IN _onMapClick");
        this.inherited(arguments);
        var that = this;

        console.log("_onMapClick - mapClickHandler: " + this._mapClickHandler);
        //if (this._mapClickHandler != null) {

        funcionOnClickInfraestructura = funcionOnClickInfraestructura2;
        funcionOnClickAfeccion = funcionOnClickAfeccion2;


        this.map.infoWindow.hide();
        //on map click clear the previous text in search textbox
        console.log("Entra en el evento click sobre el mapa");

        numInfraestructurasPrevias = 0;

        // Borrar todos las graphic layers que se hubieran añadido previamente al mapa
        this.map.graphics.clear();

        // Borrar la lista de infraestructuras del dropdown button
        var node = dom.byId('dropdownBtnListInfraest');
        while (node.hasChildNodes()) {
          node.removeChild(node.firstChild);
        }

        // El evento del mapa contiene exactamente donde ha hecho click el usuario sobre el mapa
        var point = evt.mapPoint;

        // Obtener una geometría de buffer alrededor del punto donde ha hecho click el usuario para obtener las
        // poligonales de los parques eólicos y/o las líneas eléctricas que intersectan con ese buffer
        var params = new BufferParameters();
        esriConfig.defaults.geometryService = new GeometryService(urlGeometryService);
        params.distances = [100];
        params.outSpatialReference = that.map.spatialReference;
        params.unit = GeometryService.UNIT_METER;
        params.geometries = [point];
        esriConfig.defaults.geometryService.buffer(params, getInfraestructurasIntersectanBuffer);

        function getInfraestructurasIntersectanBuffer(bufferedGeometries) {
          // Función de callback que se invoca tras generar un buffer a partir de las coordenadas
          // del punto donde el usuario ha hecho clic en el mapa, para obtener las infraestructuras de
          // tipo poligonal del parque eólico y del tipo línea eléctrica

          console.log("getInfraestructurasIntersectanBuffer");

          var geometryBuffer = bufferedGeometries[0];

          console.log("GeometryBuffer" + geometryBuffer);

          // Implementar una consulta para obtener las poligonales de los parques eólicos que intersecatan 
          // con el buffer del punto
          var queryTaskParques = new QueryTask(urlLayerParques);
          var queryParques = new Query();
          queryParques.returnGeometry = true;
          queryParques.outFields = outFieldsInfraestructuras;
          queryParques.geometry = geometryBuffer;
          queryParques.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;

          console.log("Ejecutar query sobre la layer Parques");
          queryTaskParques.execute(queryParques, _showInfraestructuras("PARQUE"));

          // Implementar una consulta para obtener las linas eléctricas que intersecatan 
          // con el buffer del punto 
          var queryTaskLinas = new QueryTask(urlLayerLinas);
          var queryLinas = new Query();
          queryLinas.returnGeometry = true;
          queryLinas.outFields = outFieldsInfraestructuras;
          queryLinas.geometry = geometryBuffer;
          queryLinas.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;

          console.log("Ejecutar query sobre la layer Linas");
          queryTaskLinas.execute(queryLinas, _showInfraestructuras("LINA"));
        }

        var _showInfraestructuras = function (tipoInfraestructura) {
          // Función de callback que se invoca tras realizar la consulta de las infraestructuras del tipo
          // pasado como parametro que intersecta con el buffer del punto

          return function (response) {
            var feature;
            var features = response.features;

            console.log("_showInfraestructuras");
            numInfraestructuras = features.length;
            console.log("Nº infraestructuras: " + numInfraestructuras.toString());

            // Cada una de las infreastructuras resultantes de la consulta se añaden al combo-box
            // del formulario que permite selecciona la infraestructura para la que se dean obtener
            // sus afecciones
            for (var i = 0; i < features.length; i++) {
              feature = features[i];

              var idInfraest = feature.attributes["id_infraest"];
              var expediente = feature.attributes["num_exped"];
              var nome = feature.attributes["nome"];
              var nomeAbreviado = feature.attributes["nome_abrev"];

              var ulBtn = dom.byId("dropdownBtnListInfraest");
              var liName = expediente + " - " + nomeAbreviado;
              var liBtn = domConstruct.create("li", {}, ulBtn);
              var aLiBtn = domConstruct.create("a", {
                'innerHTML': liName,
                'onClick': "funcionOnClickInfraestructura('" + expediente + "', '" + nomeAbreviado + "', '" + tipoInfraestructura + "');"
              }, liBtn);

              console.log("Infraestructura de tipo " + tipoInfraestructura + " con ID: " + idInfraest + " - Nº expediente: " + expediente + " - Nome: " + nome + " - Nome abreviado: " + nomeAbreviado);

              console.log("numInfraestructuras PREVIOUS: " + numInfraestructurasPrevias.toString());

              if (numInfraestructurasPrevias == 0) {
                numInfraestructurasPrevias++;

                // Si es la primera infraestructura del combo de infraestructuras se añade sobre 
                // el mapa resaltándola.                
                // Se invoca a la función funcionOnClickInfraestructura2, para rellenar en el formulario el listado 
                // de afecciones sobre el patrimonio cultural y ambiental para la primera infrestructura 
                // del combo
                funcionOnClickInfraestructura2(expediente, nomeAbreviado, tipoInfraestructura);
              }
              else
                numInfraestructurasPrevias++;
            }
          }
        }

        var _showListadoAfecciones = function (tipoAfeccion) {
          // Función de callback que se invoca tras realizar la consulta de las afecciones del tipo tipoAfeccion
          // asociadas a una infraestructura y que añade al formulario del widget el listado de esas
          // afecciones

          return function (response) {
            var feature;

            console.log("-- IN showListadoAfecciones");
            console.log("Afecciones del tipo: " + tipoAfeccion);
            var features = response.features;

            numAfecciones = features.length;
            console.log("Nº afecciones: " + numAfecciones.toString());

            // Recorrer todas las afeccciones y añadirlas al formulario
            for (var i = 0; i < features.length; i++) {
              feature = features[i];
              categoria = feature.attributes["categoria"];
              tipo = feature.attributes["tipo"];
              nome = feature.attributes["nome"];
              capa = feature.attributes["capa"];
              capaId = feature.attributes["capa_id"];
              campoId = feature.attributes["campo_id"];
              valorId = feature.attributes["valor_id"];

              console.log("Afeccion -> Categoria: " + categoria + " - Tipo:" + tipo + " - Nome: " + nome + " - Capa: " + capa + " - Capa ID: " + capaId);

              var featureRow = domConstruct.create("tr", { 'onClick': "funcionOnClickAfeccion('" + capa + "'," + capaId.toString() + ", '" + campoId + "', " + valorId + ");" }, "tableContentPatNatural");

              var newCell0 = featureRow.insertCell(0);
              newCell0.innerHTML = categoria;
              var newCell1 = featureRow.insertCell(1);
              newCell1.innerHTML = tipo;
              var newCell1 = featureRow.insertCell(2);
              newCell1.innerHTML = nome;

            }
            console.log("-- OUT showListadoAfecciones");
          }
        }

        function showInfraestructura(expediente, tipoInfraestructura) {
          // Función que muestra en el mapa la infraestructura del tipo tipoInfraestructura
          // cuyo número de experediente es expediente
          console.log("-- IN showInfraestructura");

          if (tipoInfraestructura == "PARQUE") {
            var featureLayerInfraest = new FeatureLayer(urlLayerParques, {
              mode: FeatureLayer.MODE_SELECTION,
              outFields: ["*"]
            });
            console.log("URL layer: " + urlLayerParques);
          }
          else {
            var featureLayerInfraest = new FeatureLayer(urlLayerLinas, {
              mode: FeatureLayer.MODE_SELECTION,
              outFields: ["*"]
            });
            console.log("URL layer: " + urlLayerLinas);
          }

          // Seleccionar las infraestructuras Parques o Linas cuyo nº de expediente
          // es expediente
          var query = new Query();
          var clausulaWhere = "num_exped = '" + expediente + "'";;
          query.where = clausulaWhere;
          query.outFields = outFieldsInfraestructuras;
          console.log("Seleccionar infraestructuras que cumplen la cláusula where: " + clausulaWhere);
          console.log("Query: ", query);
          console.log("FeatureLayerInfraest: ", featureLayerInfraest);


          featureLayerInfraest.selectFeatures(query, FeatureLayer.SELECTION_NEW, function (featuresSelected) {

            console.log("Número de infraestructuras tras query: " + featureLayerInfraest.graphics.length);

            console.log("Infraestructura: " + featureLayerInfraest.name);
            console.log("Establecer simbología para la geometría de tipo: " + featureLayerInfraest.geometryType);
            // Establecer la simbología en función de la geometría de la infraestructura
            switch (featureLayerInfraest.geometryType) {
              case "esriGeometryPolyline":
                // Simbología a aplicar a la infraestructura línea eléctrica
                console.log("Simbología de tipo línea para la Feature layer: " + featureLayerInfraest.name);
                var symbol = new SimpleLineSymbol(
                  SimpleLineSymbol.STYLE_SOLID,
                  new Color([255, 0, 0]), 3);
                break;
              case "esriGeometryPolygon":
                // Simbología a aplicar a la infraestructura parque eólico
                console.log("Simbología de tipo polígono para la Feature layer: " + featureLayerInfraest.name);
                var symbol = new SimpleFillSymbol(
                  SimpleFillSymbol.STYLE_SOLID,
                  new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([255, 0, 0]), 3),
                  new Color([255, 100, 100, 0.4]));
                break;
            }

            featureLayerInfraest.setSelectionSymbol(symbol);

            // Calcular la extensión de la capa a añadir al mapa
            var featureLayerInfraestExtent = graphicsUtils.graphicsExtent(featuresSelected);

            for (i = 0; i < featuresSelected.length; i++) {
              var graphic = featuresSelected[i];
              graphic.setSymbol(symbol);
              that.map.graphics.add(graphic);
            }

            // Centrar el mapa enla capa              
            // Calcular la extensión de la capa a añadir al mapa
            var featureLayerInfraestExtent = graphicsUtils.graphicsExtent(featuresSelected);
            console.log("Feature layer extent: " + featureLayerInfraestExtent);

            var screenpoint = that.map.toScreen(featureLayerInfraestExtent);
            var mappoint = that.map.toMap(screenpoint);
            that.map.setExtent(featureLayerInfraestExtent, true);

            // Mostrar pop up de información de la afección
            //that.map.infoWindow.show(featureLayerAfeccionExtent.getCenter(), that.map.getInfoWindowAnchor(screenpoint));

          });
          console.log("-- OUT showInfraestructura");
        }

        function funcionOnClickInfraestructura2(expediente, nomeAbreviado, tipoInfraestructura) {
          // Función que se invoca cuando el usuario selecciona una infraestructura del 
          // formulario o cuando tras hacer clic sobre el mapa se rellena el combo box 
          // De infraestructuras y se cargan en el formulario el listado de afecciones
          // del patrimonio ambiental y cultural de esa infraetructura
          console.log("-- IN funcionOnClickInfraestructura2");

          // Borrar todos los gráficos del mapa
          that.map.graphics.clear();

          // Actualizar el nombre de la infraestructura
          var h4NomeInfraest = dom.byId("nameInfraestructura");
          h4NomeInfraest.innerText = expediente + " - " + nomeAbreviado;

          // Mostrar la infraestructura del tipo tipoInfraestructura con 
          // el número de expediente expediente
          console.log("Llamar a la funcion showInfraestructura");
          showInfraestructura(expediente, tipoInfraestructura);

          // Borrar las filas existentes en la tabla de afecciones 
          var node = document.getElementById('tableContentPatNatural');
          while (node.hasChildNodes()) {
            node.removeChild(node.firstChild);
          }

          // Obtener las afecciones del primer expediente de infraestructura encontrado
          // Obtener las poligonales de los parques que intersecatan con el punto 


          var tipoAfeccion = "NATURAL";
          // Calcular para cada tipo de afeccion sobre el patrimonio (NATURAL, CULTURAL) las entidades
          // que se corresponden 

          console.log("Tipo de afeccion: " + tipoAfeccion)
          // Obtener la URL de la tabla AFEC_PATRIMONIO_NATURAL dentro del servico de edición
          var urlAfecciones = urlTableAfeccionesNaturales;
          console.log("URL Afeccion: " + urlAfecciones)

          // Implementar la consulta para obtener 
          var queryTaskAfecciones = new QueryTask(urlAfecciones);
          var queryAfecciones = new Query();
          queryAfecciones.returnGeometry = false;
          queryAfecciones.outFields = outFieldsAfecciones;
          //queryAfeccionesNatural.orderByFields = ["cateogoria tipo DESC"];

          var clausulaWhere = "num_exped = '" + expediente + "'";
          queryAfecciones.where = clausulaWhere;
          console.log("clausulaWhere: " + clausulaWhere);
          console.log("Ejecutar query sobre tipo de afección " + tipoAfeccion);
          queryTaskAfecciones.execute(queryAfecciones, _showListadoAfecciones(tipoAfeccion));
          console.log("Ejecutada query");


          console.log("-- OUT funcionOnClickInfraestructura2");
        }


        function funcionOnClickAfeccion2(capa, capaId, campoId, valorId) {

          console.log("-- IN uncionOnClickAfeccion2");

          console.log("Capa: " + capa + " - capaId: " + capaId.toString() + " - campoId: " + campoId + "- valorId: " + valorId);

          // Borrar entidad de afecciones anterior que se hubiera añadido al mapa
          /*if (featureLayerAfeccionAnterior != null) {
            console.log("Borrar la feature Afeccion anterior: " + featureLayerAfeccionAnterior.name + " - tipo geometría: " + featureLayerAfeccionAnterior.geometryType);
            that.map.removeLayer(featureLayerAfeccionAnterior);
          }*/
          console.log("Nº de graphics de afecciones anteriores a borrar: " + graphicsAfeccionesAnteriores.graphics.length);
          for (i = 0; i < graphicsAfeccionesAnteriores.graphics.length; i++) {
            //that.map.graphics.clear();
            that.map.graphics.remove(graphicsAfeccionesAnteriores.graphics[i]);
          }

          // Componer la url de la capa concatenando a la URL del servicio de mapa el id de la capa de patrimonio
          // ambiental o cultural
          urlFeatureLayerAfeccion = urlServicioMapa + capaId.toString();
          console.log("URL Feature layer: " + urlFeatureLayerAfeccion);
          // Crear una consulta para seleccionar la entidad de la capa de patrimonio natural o 
          // cultural que representa la afección
          var featureLayerAfeccion = new FeatureLayer(urlFeatureLayerAfeccion, {
            mode: FeatureLayer.MODE_ONDEMAND,
            outFields: ["*"]
          });

          // Seleccionar las afecciones del patrimonio natural o cultural, cuyo
          // campoId, tiene el valorId, que se pasan como parámetros
          var query = new Query();
          var clausulaWhere = campoId + " = " + valorId.toString();
          query.where = clausulaWhere;
          query.outFields = ["*"];
          console.log("Seleccionar entidades que cumplen la cláusula where: " + clausulaWhere);

          featureLayerAfeccion.selectFeatures(query, FeatureLayer.SELECTION_NEW, function (featuresSelected) {
            // Se seleccionan las afecciones
            console.log("Número de Afecciones trasla query: " + featureLayerAfeccion.graphics.length);

            console.log("Feature layer de Afecciones: " + featureLayerAfeccion.name);
            console.log("Establecer simbología para la geometría de tipo: " + featureLayerAfeccion.geometryType);
            // Establecer la simbología en función de la geometría de la entidad de patrimonio afectada
            switch (featureLayerAfeccion.geometryType) {
              case "esriGeometryPoint":
                console.log("Simbología de tipo punto para la Feature layer: " + featureLayerAfeccion.name);
                // Simbología a aplicar al elemento de patrimonio natural de tipo punto afectado
                var symbol = new SimpleMarkerSymbol(
                  SimpleMarkerSymbol.STYLE_CIRCLE,
                  20,
                  new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([0, 0, 255]), 2),
                  new Color([0, 255, 255, 0.8]));
                break;
              case "esriGeometryPolyline":
                // Simbología a aplicar al elemento de patrimonio natural de tipo línea afectado
                console.log("Simbología de tipo línea para la Feature layer: " + featureLayerAfeccion.name);
                var symbol = new SimpleLineSymbol(
                  SimpleLineSymbol.STYLE_SOLID,
                  new Color([0, 255, 255]), 2);
                break;
              case "esriGeometryPolygon":
                // Simbología a aplicar al elemento de patrimonio natural de tipo línea afectado
                console.log("Simbología de tipo polígono para la Feature layer: " + featureLayerAfeccion.name);
                var symbol = new SimpleFillSymbol(
                  SimpleFillSymbol.STYLE_SOLID,
                  new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([0, 0, 255]), 2),
                  new Color([0, 255, 255, 0.3]));
                break;
            }

            featureLayerAfeccion.setSelectionSymbol(symbol);

            // Calcular la extensión de la capa a añadir al mapa
            var featureLayerAfeccionExtent = graphicsUtils.graphicsExtent(featuresSelected);

            for (i = 0; i < featuresSelected.length; i++) {
              var graphic = featuresSelected[i];
              graphic.setSymbol(symbol);
              that.map.graphics.add(graphic);
              graphicsAfeccionesAnteriores.add(graphic)
            }

            // Centrar el mapa enla capa              
            // Calcular la extensión de la capa a añadir al mapa
            var featureLayerAfeccionExtent = graphicsUtils.graphicsExtent(featuresSelected);
            console.log("Feature layer extent: " + featureLayerAfeccionExtent);


            if (featureLayerAfeccion.geometryType == "esriGeometryPoint") {
              // Centrar el mapa enla capa              
              console.log("Centrar la geometría de tipo punto");
              //that.map.setExtent(featureLayerAfeccionExtent, true);
              that.map.centerAndZoom(featureLayerAfeccionExtent.getCenter(), 13);
            }
            else {
              console.log("Centrar la geometría que no es de tipo punto");
              var screenpoint = that.map.toScreen(featureLayerAfeccionExtent);
              var mappoint = that.map.toMap(screenpoint);
              that.map.setExtent(featureLayerAfeccionExtent, true);
            }
          });
          //featureLayerAfeccionAnterior = featureLayerAfeccion;
          console.log("-- OUT uncionOnClickAfeccion2");
        }

        console.log("--OUT _onMapClick");

      },

      //methods to communication with app container:

      postCreate: function () {
        //   this.inherited(arguments);
        //   console.log('postCreate');
        console.log("-- IN postCreate");
        console.log("-- OUT postCreate");
      },

      /*startup: function() {
        this.inherited(arguments);
        this.mapIdNode.innerHTML = 'map id:' + this.map.id;
        console.log('startup');
      },*/


      onOpen: function () {
        console.log("-- IN onOpen");

        // Borrar la capa anterior del patrimonio ambiental o cultural que se añadió previamente al mapa
        /*if (featureLayerAfeccionAnterior != null) {
          this.map.removeLayer(featureLayerAfeccionAnterior);
        }*/
        this.map.infoWindow.hide();
        this.map.graphics.clear();

        // Capturar el envento click del mapa
        if (!this._mapClickHandler) {
          console.log("_mapClickHandler vacío")
          this._connectMapEventHandler();
        }
        //this.map.on("click", lang.hitch(this, this._onMapClick));
        console.log("-- OUT onOpen");
      },

      onClose: function () {
        console.log('-- IN onClose');
        //this.map.setInfoWindowOnClick(true);
        this._disconnectMapEventHandler();

        /*if (featureLayerAfeccionAnterior != null) {
          this.map.removeLayer(featureLayerAfeccionAnterior);
        }*/
        this.map.infoWindow.hide();
        this.map.graphics.clear();
        console.log('-- OUT onClose');
      },

      onMinimize: function () {
        console.log('-- IN onMinimize');

        this._disconnectMapEventHandler();

        /*if (featureLayerAfeccionAnterior != null) {
          this.map.removeLayer(featureLayerAfeccionAnterior);
        }*/
        this.map.infoWindow.hide();
        this.map.graphics.clear();
        console.log('-- OUT onMinimize');
      },

      onDeActive: function () {
        console.log('-- IN onDeActive');

        this._disconnectMapEventHandler();

        /* if (featureLayerAfeccionAnterior != null) {
           this.map.removeLayer(featureLayerAfeccionAnterior);
         }*/
        this.map.infoWindow.hide();
        this.map.graphics.clear();

        console.log('-- OUT onDeActive');
      },

      onMaximize: function () {
        console.log('-- IN onMaximize');

        this._connectMapEventHandler();
        console.log('-- OUT onMaximize');
      },

      // onSignIn: function(credential){
      //   /* jshint unused:false*/
      //   console.log('onSignIn');
      // },

      // onSignOut: function(){
      //   console.log('onSignOut');
      // }

      // onPositionChange: function(){
      //   console.log('onPositionChange');
      // },

      // resize: function(){
      //   console.log('resize');
      // }

      //methods to communication between widgets:

    });
  });