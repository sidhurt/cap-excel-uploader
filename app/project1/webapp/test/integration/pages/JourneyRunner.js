sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"project1/test/integration/pages/SalesOrdersMain"
], function (JourneyRunner, SalesOrdersMain) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('project1') + '/test/flp.html#app-preview',
        pages: {
			onTheSalesOrdersMain: SalesOrdersMain
        },
        async: true
    });

    return runner;
});

