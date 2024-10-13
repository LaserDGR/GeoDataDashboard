require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/widgets/LayerList"
], function (Map, MapView, FeatureLayer, LayerList) {
    const map = new Map({
        basemap: "topo-vector"
    });

    const view = new MapView({
        container: "map",
        map: map,
        center: [-110.309, 24.142],
        zoom: 6
    });

    const municipiosLayer = new FeatureLayer({
        url: "https://services6.arcgis.com/cdylwBTTDF2F9FTY/ArcGIS/rest/services/BCS/FeatureServer/0",
        visible: true
    });

    const proyectosLayer = new FeatureLayer({
        url: "https://services6.arcgis.com/cdylwBTTDF2F9FTY/ArcGIS/rest/services/CAPA_PROYECTOS/FeatureServer",
        visible: true,
        popupTemplate: {
            title: "{PROYECTO}",
            content: `
                <div class="circular-chart">
                    <div class="fill"></div>
                </div>
                <p>Unidades Totales: {UDS_TOT}</p>
                <p>Unidades Vendidas: {UDS_VEND}</p>
            `
        }
    });

    map.addMany([municipiosLayer, proyectosLayer]);

    const layerList = new LayerList({
        view: view
    });
    view.ui.add(layerList, "top-right");

    function populateSelect() {
        municipiosLayer.queryFeatures({
            where: "1=1",
            outFields: ["NOMGEO"],
            returnGeometry: false
        }).then(function (result) {
            const select = document.getElementById("municipalitySelect");
            result.features.forEach(function (feature) {
                const option = document.createElement("option");
                option.value = feature.attributes.NOMGEO;
                option.text = feature.attributes.NOMGEO;
                select.add(option);
            });
        }).catch(function (error) {
            console.error("Error al llenar el select:", error);
        });
    }

    function fetchPopulationData(municipio) {
        const query = municipio ? `NOMGEO = '${municipio}'` : "1=1";

        municipiosLayer.queryFeatures({
            where: query,
            outFields: [
                "POB1", "POB2", "POB3", "POB4", "POB5", 
                "POB6", "POB7", "POB8", "POB9", "POB10", 
                "POB11", "POB12", "POB13", "POB14", "POB15",
                "POB16", "POB17", "POB18", "POB19", "POB20",
                "POB21", "POB22", "POB23", "POB24", "POB25",
                "POB2_R", "POB4_R", "POB5_R", "POB6_R", 
                "POB7_R", "POB8_R", "POB9_R", "POB10_R", 
                "POB11_R", "POB12_R", "POB13_R", "POB14_R", 
                "POB15_R", "POB16_R", "POB17_R", "POB18_R",
                "POB19_R", "POB20_R", "POB21_R", "POB22_R",
                "POB23_R", "POB24_R", "POB25_R"
            ],
            geometry: view.extent,
            spatialRelationship: "intersects",
            returnGeometry: false
        }).then(function (result) {
            const maleData = new Array(18).fill(0);
            const femaleData = new Array(18).fill(0);

            if (result.features.length === 0) {
                console.warn("No se encontraron datos para el municipio seleccionado.");
                createVerticalBarChart(maleData, femaleData);
                return;
            }

            result.features.forEach(function (feature) {
                for (let i = 0; i < 18; i++) {
                    maleData[i] += feature.attributes[`POB${i + 1}`] || 0;
                    femaleData[i] += feature.attributes[`POB${i + 1}_R`] || 0;
                }
            });

            createVerticalBarChart(maleData, femaleData);
        }).catch(function (error) {
            console.error("Error al obtener los datos de población:", error);
            createVerticalBarChart([], []);
        });
    }

    function createVerticalBarChart(maleData, femaleData) {
        const canvas = document.getElementById("populationChart");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const containerWidth = canvas.parentElement.clientWidth;
        canvas.width = containerWidth - 20;
        const adjustedBarWidth = (canvas.width - 40) / (maleData.length * 2) - 5;

        const maxVal = Math.max(Math.max(...maleData), Math.max(...femaleData));

        for (let i = 0; i < maleData.length; i++) {
            const maleBarHeight = (maleData[i] / maxVal) * (canvas.height - 50);
            const femaleBarHeight = (femaleData[i] / maxVal) * (canvas.height - 50);

            ctx.fillStyle = "blue";
            ctx.fillRect(i * (adjustedBarWidth * 2 + 10) + 25, canvas.height - maleBarHeight - 30, adjustedBarWidth, maleBarHeight);

            ctx.fillStyle = "black";
            ctx.fillRect(i * (adjustedBarWidth * 2 + 10) + 25 + adjustedBarWidth, canvas.height - femaleBarHeight - 30, adjustedBarWidth, femaleBarHeight);

            ctx.fillStyle = "black";
            ctx.fillText(femaleData[i].toFixed(1), i * (adjustedBarWidth * 2 + 10) + 25 + adjustedBarWidth, canvas.height - femaleBarHeight - 35);
            ctx.fillText(maleData[i].toFixed(1), i * (adjustedBarWidth * 2 + 10) + 25, canvas.height - maleBarHeight - 35);
        }

        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        for (let i = 0; i < maleData.length; i++) {
            ctx.fillText(`${i * 5}-${(i + 1) * 5 - 1}`, i * (adjustedBarWidth * 2 + 10) + 25 + adjustedBarWidth, canvas.height - 10);
        }
    }

    function fetchProjectData(feature) {
        const udsTotales = feature.attributes.UDS_TOT || 0;
        const udsVendidas = feature.attributes.UDS_VEND || 0;

        drawUnitsChart(udsTotales, udsVendidas);
    }

    function drawUnitsChart(udsTotales, udsVendidas) {
        const chartDiv = document.querySelector('.circular-chart .fill');

        const total = udsTotales + udsVendidas;
        const percentage = total > 0 ? (udsVendidas / total) * 100 : 0;

        if (chartDiv) {
            chartDiv.style.height = `${percentage}%`;
            chartDiv.style.backgroundColor = 'black';
        } else {
            console.error('chartDiv no encontrado');
        }
    }

    function fetchInventoryData(municipio) {
        const query = municipio ? `NOMGEO = '${municipio}'` : "1=1";

        proyectosLayer.queryFeatures({
            where: query,
            outFields: ["UDS_TOT", "ABS_MES"],
            returnGeometry: false
        }).then(function (result) {
            const totalUnits = [];
            const averageAbsMen = [];

            result.features.forEach(function (feature) {
                totalUnits.push(feature.attributes.UDS_TOT || 0);
                averageAbsMen.push(feature.attributes.ABS_MES || 0);
            });

            drawInventoryChart(totalUnits, averageAbsMen);
            fetchKPIData(municipio); 
        }).catch(function (error) {
            console.error("Error al obtener los datos del inventario:", error);
        });
    }

    function drawInventoryChart(totalUnits, averageAbsMen) {
        google.charts.load('current', { packages: ['corechart', 'line'] });
        google.charts.setOnLoadCallback(function () {
            const data = new google.visualization.DataTable();
            data.addColumn('string', 'Rango');
            data.addColumn('number', 'UDS Totales');
            data.addColumn('number', 'ABS/MEN');

            const ranges = ['0-20', '21-40', '41-60', '61-80', '81-100'];

            for (let i = 0; i < ranges.length; i++) {
                const total = totalUnits[i] || 0;
                const avg = averageAbsMen[i] || 0;
                data.addRow([ranges[i], total, avg]);
            }

            const options = {
                title: 'Inventario Total por Precio',
                curveType: 'function',
                legend: { position: 'bottom' },
                series: {
                    0: { color: 'blue' },
                    1: { color: 'orange' }
                },
                hAxis: {
                    title: 'Rango'
                },
                vAxis: {
                    title: 'Cantidad'
                }
            };

            const chart = new google.visualization.LineChart(document.getElementById('inventoryChart'));

            chart.draw(data, options);
        });
    }

    function fetchKPIData(municipio) {
        const query = municipio ? `NOMGEO = '${municipio}'` : "1=1";

        proyectosLayer.queryFeatures({
            where: query,
            outFields: ["UDS_TOT", "UDS_DISP", "UDS_VEND", "ABS_MES"],
            returnGeometry: false
        }).then(function (result) {
            let totalProjects = 0;
            let totalUnits = 0;
            let totalAvailableUnits = 0;
            let totalAbsMen = 0;

            result.features.forEach(function (feature) {
                totalProjects++;
                totalUnits += feature.attributes.UDS_TOT || 0;
                totalAvailableUnits += feature.attributes.UDS_DISP || 0;
                totalAbsMen += feature.attributes.ABS_MES || 0;
            });

            const averagePricePerUnit = totalProjects > 0 ? (totalAbsMen / totalProjects) : 0;

            document.getElementById("totalProjects").innerText = totalProjects;
            document.getElementById("totalUnits").innerText = totalUnits;
            document.getElementById("totalAvailableUnits").innerText = totalAvailableUnits;
            document.getElementById("averagePricePerUnit").innerText = averagePricePerUnit.toFixed(2);
        }).catch(function (error) {
            console.error("Error al obtener los KPI's:", error);
        });
    }

    populateSelect();

    document.getElementById("municipalitySelect").addEventListener("change", function (event) {
        const selectedMunicipio = event.target.value;
        fetchPopulationData(selectedMunicipio);
        fetchInventoryData(selectedMunicipio);
    });

    view.watch("stationary", function (newValue) {
        if (newValue) {
            const selectedMunicipio = document.getElementById("municipalitySelect").value;
            fetchPopulationData(selectedMunicipio);
            fetchInventoryData(selectedMunicipio);
            fetchKPIData(selectedMunicipio);
        }
    });

    fetchPopulationData();
    fetchInventoryData();
    fetchKPIData();

    view.on("click", function(event) {
        view.hitTest(event).then(function(response) {
            const feature = response.results.filter(result => result.graphic.layer === proyectosLayer)[0];
            if (feature) {
                fetchProjectData(feature.graphic);
            }
        });
    });
});

