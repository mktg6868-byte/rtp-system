module.exports = function (app) {

    // TEMP endpoint for future game provider injection
    app.get("/rtp-data", async (req, res) => {
        res.json({
            status: "development",
            message: "Provider injection not yet implemented"
        });
    });

};
