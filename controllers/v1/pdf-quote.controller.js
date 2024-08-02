const {launch} = require("puppeteer");
const path = require('path');
const fs = require('fs');
const glassCoveringSchema = require("../../models/glassCovering.model");
const {model} = require("../../models/cart.model");
const {createSuccessResponse} = require("../../helpers/utils");

const imageAndPdfGenerator = async (req, res) => {
    const RequestObj = req.body.data[0]

    const orderId = Math.random().toString(36).substr(2, 10).toUpperCase();

    const panelSizes = RequestObj["newPanels"]
        .filter(item => item.name.toLowerCase() !== "door")
        .map(item => item.value);

    const sizesString = panelSizes.join(", ");
    const panelsPrice = RequestObj["newPanels"]
        .filter(item => item.name.toLowerCase() !== "door")
        .reduce((sum, item) => sum + item.value, 0);

    const panelsLength = RequestObj["newPanels"]
        .filter(item => item.name.toLowerCase() !== "door")
        .reduce((sum, item) => sum + item.value, 0);

    let glassCoveringPrice = 0
    const glassCoveringList = await glassCoveringSchema.find({ glassType: 'clear' })
    if (glassCoveringList) {
        glassCoveringPrice = glassCoveringList[0].price * panelsLength
    }

    let recommendedOpeningWidth;
    if ((RequestObj["skipThirdStep"] === false) && RequestObj["newDoor"]?.doorSize) {
        if (RequestObj["wallLength"] === (RequestObj["newDoor"]?.doorSize + panelsLength)) {
            recommendedOpeningWidth = panelsLength + RequestObj["newDoor"]?.doorSize + 20
        }
    } else {
        if (RequestObj["wallLength"] === panelsLength) {
            recommendedOpeningWidth = panelsLength + 20
        }
    }

    let patishonWidth;
    if (RequestObj["skipThirdStep"] === false) {
        patishonWidth = RequestObj["newDoor"]?.doorSize + panelsLength + 20
    } else {
        patishonWidth = panelsLength + 20
    }

    let totalPrice;
    if (!RequestObj["skipThirdStep"]) {
        totalPrice = panelsPrice +
            (RequestObj["wallLength"] === (RequestObj["newDoor"].doorSize + panelsPrice) ? 20 : 0) +
            RequestObj["newDoor"].doorPrice +
            glassCoveringPrice;
    } else {
        totalPrice = panelsPrice +
            (RequestObj["wallLength"] === panelsPrice ? 20 : 0) +
            glassCoveringPrice;
    }

    const data = {
        orderId,
        productType: RequestObj["product"].name === 'Fixed to two wall' ? RequestObj["product"].name + 's' : RequestObj["product"].name,
        patishonHeight: RequestObj["wallHeight"],
        recommendedWidth: recommendedOpeningWidth,
        glassCovering: RequestObj["glassCovering"],
        glassCoveringPrice,
        horizontalBars: RequestObj["numberOfHorizontalFrames"],
        frameColor: RequestObj["frameColorCode"],
        panelSizesString: sizesString,
        panelPrice: panelsPrice,
        totalPrice,
        mainImg: RequestObj["newImage"],
        mainImgWidth: RequestObj["newImageWidth"],
        mainImgHeight: RequestObj["newImageHeight"],
        newPanels: RequestObj["newPanels"],

        skipThirdStep: RequestObj["skipThirdStep"],
        doorCategory: RequestObj["newDoor"]?.doorCategory || null,
        doorType: RequestObj["newDoor"]?.doorType || null,
        doorTypeOfOpening: RequestObj["newDoor"]?.doorCategory === 'hinged' ? RequestObj["newDoor"]?.typeOfOpening : null,
        doorDirectionOfOpening: (RequestObj["newDoor"]?.doorCategory === 'sliding' && RequestObj["newDoor"]?.doorType === 'single') ? RequestObj["newDoor"]?.directionOfOpening : null,
        doorHandlePosition: (RequestObj["newDoor"].doorCategory === 'hinged' && RequestObj["newDoor"].doorType === 'single') ? RequestObj["newDoor"]?.handlePosition : null,
        doorSize: RequestObj["newDoor"]?.doorSize || 'n/a',
        doorStyle: (RequestObj["door"]?.horizontalBars > 0) ? "Framed" : "Frameless",
        doorHorizontalBars: RequestObj["door"]?.horizontalBars > 0 ? RequestObj["door"]?.horizontalBars : null,
        doorFrameDesign: RequestObj["numberOfHorizontalFrames"] > 0 ? "Framed" : 'Frameless',
        doorPrice: RequestObj["newDoor"]?.doorPrice || null,

        patishonWidth,
    };

    const html = await new Promise((resolve, reject) => {
        res.render('template', data, (err, html) => {
            if (err) return reject(err);
            resolve(html);
        });
    });

    const browser = await launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true
    });
    await browser.close();

    if (req.body.fromCart) await model.deleteMany();

    const pdfDirectory = path.resolve(__dirname, '../../public/pdf');
    const clientFileName = `${data.orderId}_client_${Date.now()}.pdf`;
    const filePath = path.join(pdfDirectory, clientFileName);

    fs.writeFileSync(filePath, pdfBuffer);

    return res.status(200).json(createSuccessResponse("PDF", ['public/pdf/' + clientFileName]));
};

module.exports = {
    imageAndPdfGenerator
};
