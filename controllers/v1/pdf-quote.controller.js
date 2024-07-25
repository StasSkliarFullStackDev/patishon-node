const productSchema = require("../../models/products.model");
const OrderSchema = require("../../models/order.model");
const tolranceSchema = require("../../models/tolerance.model");
const { jsPDF } = require("jspdf");
const fs = require("fs");
const cartSchema = require("../../models/cart.model");
const { createSuccessResponse } = require("../../helpers/utils");
const glassCoveringSchema = require("../../models/glassCovering.model");
const message = require("../../helpers/message");
const puppeteer = require('puppeteer');
const path = require('path');

const imageAndPdfGenerator = async (req, res) => {
    const pdfDataArray = req.body.data;
    const pdfArray = [];
    const clientPdfArray = [];
    const orderId = Math.random().toString(36).substr(2, 10).toUpperCase();

    for (let i = 0; i < pdfDataArray.length; i++) {
        const data = req.body.data[i];
        const fileName = `public/pdf/${data.name}_${Date.now()}.pdf`;
        const clientFileName = `public/pdf/${data.name}_client_${Date.now()}.pdf`;

        const keys = ["product", "price", "frameVarient", "frameType", "roomSize", "partition"];
        let object = Object.assign({});

        keys.map(i => data[i] ? object[i] = data[i] : null);
        object['pdf'] = fileName;
        object['clientPdf'] = fileName;
        object['leftPanelSize'] = data?.panels?.left?.size;
        object['rightPanelSize'] = data?.panels?.right?.size;
        object['orderId'] = orderId;

        if (data.door) {
            object['doorGlass'] = data.door.doorGlass;
            object['doorChannel'] = data.door.doorChannel;
            object['doorCategory'] = data.door.doorCategory;
            object['doorHinges'] = data.door.doorHinges;
            object['handleVarient'] = data.door.handleVarient;
        }

        let productDetails = await productSchema.findOne({ productName: data.product.name });
        if (productDetails) object.product.image = productDetails.productImage;
        let order = await OrderSchema.model(object).save();

        const colorCodes = {
            headRail: "#7e4f25",
            default: "#000000",
            floorRail: "#e30a16",
            vertivalFramingChannel: "#40b06f",
            horizontalFramingChannel: "#f39608",
            panels: "#009fe3",
            horizontalBars: "#951b81"
        };

        const tolrance = await tolranceSchema.model.findOne();

        const doc = new jsPDF({ orientation: "landscape" });
        const pageWidth = doc.internal.pageSize.getWidth() - 30;
        const ratio = 9000 / pageWidth;
        const width = data.wallLength / ratio;
        const extraMarginFromLeftRight = width > 0 ? (pageWidth - width) / 2 : 0;
        const descriptionStartPoint = 40;
        const marginFronLeftRight = 15 + extraMarginFromLeftRight;
        const height = 150;
        const marginFromTop = 25;
        const spaceBeetweenPanels = 2;
        const panelMarginFromHeadrail = 15;
        const panelMarginFromFloorail = 10;
        const railLineWidth = 1;
        const panelLineWidth = 0.8;
        const panelHeight = height - marginFromTop - panelMarginFromHeadrail - panelMarginFromFloorail;

        let curretWidth = marginFronLeftRight;
        let leftPanelsEndPoint = curretWidth;
        let rightPanelsStartPoint = curretWidth;

        // logo
        let iamgeData = fs.readFileSync('public/logo/logo.png').toString('base64');
        doc.addImage(iamgeData, "png", 10, 10, 50, 10);

        // header data
        doc.setFontSize(10);
        doc.text(`Order ID`, 225, 15);
        doc.text(`:`, 250, 15);
        doc.text(`${orderId}`, 255, 15);

        doc.setFontSize(10);
        doc.text(`Product Type`, 225, 20);
        doc.text(`:`, 250, 20);
        doc.text(`${data.product.name}`, 255, 20);

        // head rail
        doc.setDrawColor(colorCodes.headRail);
        doc.setLineWidth(railLineWidth);
        doc.line(marginFronLeftRight, marginFromTop, width + marginFronLeftRight, marginFromTop);

        // left panels
        if (data?.panels?.left?.count > 0) {
            let spaceToRemove = (spaceBeetweenPanels * (data.panels.left.count - 1)) / data.panels.left.count;
            let panelSize = (data.panels.left.size / ratio) - spaceToRemove;

            for (let i = 0; i < data.panels.left.count; i++) {
                let startPoint = i == 0 ? curretWidth : curretWidth + spaceBeetweenPanels;
                let endPoint = startPoint + panelSize;
                curretWidth = endPoint;

                // walls
                doc.setLineWidth(panelLineWidth);
                doc.setDrawColor(colorCodes.vertivalFramingChannel);
                doc.line(startPoint, marginFromTop + panelMarginFromHeadrail, startPoint, height - panelMarginFromFloorail);
                doc.line(endPoint, marginFromTop + panelMarginFromHeadrail, endPoint, height - panelMarginFromFloorail);

                // top and bottom
                doc.setLineWidth(panelLineWidth);
                doc.setDrawColor(colorCodes.horizontalFramingChannel);
                doc.line(startPoint + 1, marginFromTop + panelMarginFromHeadrail - 1, endPoint - 1, marginFromTop + panelMarginFromHeadrail - 1);
                doc.line(startPoint + 1, height - panelMarginFromFloorail + 1, endPoint - 1, height - panelMarginFromFloorail + 1);

                // inner rectangle
                doc.setFillColor(colorCodes.panels);
                doc.rect(startPoint + 1, marginFromTop + panelMarginFromHeadrail, endPoint - startPoint - 2, height - panelMarginFromFloorail - marginFromTop - panelMarginFromHeadrail, "F");

                // horizontal bars
                if (data?.panels?.left?.horizontalBars > 0) {
                    let spaceBetweenHorizontalBars = panelHeight / (data.panels.left.horizontalBars + 1);
                    let currentLinePosition = marginFromTop + panelMarginFromHeadrail;

                    for (let j = 0; j < data.panels.left.horizontalBars; j++) {
                        currentLinePosition = currentLinePosition + spaceBetweenHorizontalBars;
                        doc.setLineWidth(panelLineWidth);
                        doc.setDrawColor(colorCodes.horizontalBars);
                        doc.line(startPoint + 1, currentLinePosition, endPoint - 1, currentLinePosition);
                    }
                }
            }

            leftPanelsEndPoint = curretWidth;

            // floor rail for left panels
            doc.setDrawColor(colorCodes.floorRail);
            doc.setLineWidth(railLineWidth);
            doc.line(marginFronLeftRight, height, leftPanelsEndPoint, height);
        }

        // door
        if (data.door) {
            let spaceToRemove = data.panels.left.count > 0 ? spaceBeetweenPanels : 0;
            let doorSize = (data.door.size / ratio) - spaceToRemove;

            let startPoint = data.panels.left.count > 0 ? curretWidth + spaceBeetweenPanels : curretWidth;
            let endPoint = startPoint + doorSize;
            curretWidth = endPoint;

            // walls
            doc.setLineWidth(panelLineWidth);
            doc.setDrawColor(colorCodes.vertivalFramingChannel);
            doc.line(startPoint, marginFromTop + panelMarginFromHeadrail, startPoint, height - panelMarginFromFloorail);
            doc.line(endPoint, marginFromTop + panelMarginFromHeadrail, endPoint, height - panelMarginFromFloorail);

            // top and bottom
            doc.setLineWidth(panelLineWidth);
            doc.setDrawColor(colorCodes.horizontalFramingChannel);
            doc.line(startPoint + 1, marginFromTop + panelMarginFromHeadrail - 1, endPoint - 1, marginFromTop + panelMarginFromHeadrail - 1);
            doc.line(startPoint + 1, height - panelMarginFromFloorail + 1, endPoint - 1, height - panelMarginFromFloorail + 1);

            // inner rectangle
            doc.setFillColor(colorCodes.panels);
            doc.rect(startPoint + 1, marginFromTop + panelMarginFromHeadrail, endPoint - startPoint - 2, height - panelMarginFromFloorail - marginFromTop - panelMarginFromHeadrail, "F");

            // horizontal bars
            if (data?.door?.horizontalBars > 0) {
                let spaceBetweenHorizontalBars = panelHeight / (data.door.horizontalBars + 1);
                let currentLinePosition = marginFromTop + panelMarginFromHeadrail;

                for (let i = 0; i < data.door.horizontalBars; i++) {
                    currentLinePosition = currentLinePosition + spaceBetweenHorizontalBars;
                    doc.setLineWidth(panelLineWidth);
                    doc.setDrawColor(colorCodes.horizontalBars);
                    doc.line(startPoint + 1, currentLinePosition, endPoint - 1, currentLinePosition);
                }
            }
        }

        // right panels
        if (data?.panels?.right?.count > 0) {
            let spaceToRemove = (spaceBeetweenPanels * data.panels.right.count) / data.panels.right.count;
            let panelSize = (data.panels.right.size / ratio) - spaceToRemove;
            rightPanelsStartPoint = data.door ? curretWidth + spaceBeetweenPanels : curretWidth;

            for (let i = 0; i < data.panels.right.count; i++) {
                let startPoint = data.door ? curretWidth + spaceBeetweenPanels : curretWidth;
                let endPoint = startPoint + panelSize;
                curretWidth = endPoint;

                // walls
                doc.setLineWidth(panelLineWidth);
                doc.setDrawColor(colorCodes.vertivalFramingChannel);
                doc.line(startPoint, marginFromTop + panelMarginFromHeadrail, startPoint, height - panelMarginFromFloorail);
                doc.line(endPoint, marginFromTop + panelMarginFromHeadrail, endPoint, height - panelMarginFromFloorail);

                // top and bottom
                doc.setLineWidth(panelLineWidth);
                doc.setDrawColor(colorCodes.horizontalFramingChannel);
                doc.line(startPoint + 1, marginFromTop + panelMarginFromHeadrail - 1, endPoint - 1, marginFromTop + panelMarginFromHeadrail - 1);
                doc.line(startPoint + 1, height - panelMarginFromFloorail + 1, endPoint - 1, height - panelMarginFromFloorail + 1);

                // inner rectangle
                doc.setFillColor(colorCodes.panels);
                doc.rect(startPoint + 1, marginFromTop + panelMarginFromHeadrail, endPoint - startPoint - 2, height - panelMarginFromFloorail - marginFromTop - panelMarginFromHeadrail, "F");

                // horizontal bars
                if (data?.panels?.right?.horizontalBars > 0) {
                    let spaceBetweenHorizontalBars = panelHeight / (data.panels.right.horizontalBars + 1);
                    let currentLinePosition = marginFromTop + panelMarginFromHeadrail;

                    for (let j = 0; j < data.panels.right.horizontalBars; j++) {
                        currentLinePosition = currentLinePosition + spaceBetweenHorizontalBars;
                        doc.setLineWidth(panelLineWidth);
                        doc.setDrawColor(colorCodes.horizontalBars);
                        doc.line(startPoint + 1, currentLinePosition, endPoint - 1, currentLinePosition);
                    }
                }
            }

            // floor rail for right panels
            doc.setDrawColor(colorCodes.floorRail);
            doc.setLineWidth(railLineWidth);
            doc.line(rightPanelsStartPoint, height, curretWidth, height);
        }

        // color declarations
        let descriptionHeight = height + 20;
        let colorBoxHeight = height + 17.5;
        let boxWidth = 3;
        let boxHeight = 3;

        doc.setFontSize(10);
        doc.text("Head Channel", descriptionStartPoint, descriptionHeight);
        doc.setFillColor(colorCodes.headRail);
        doc.rect(descriptionStartPoint + 25, colorBoxHeight, boxWidth, boxHeight, "F");

        doc.text("Floor Channel", descriptionStartPoint + 35, descriptionHeight);
        doc.setFillColor(colorCodes.floorRail);
        doc.rect(descriptionStartPoint + 60, colorBoxHeight, boxWidth, boxHeight, "F");

        doc.text("Vertical Framing Channel", descriptionStartPoint + 70, descriptionHeight);
        doc.setFillColor(colorCodes.vertivalFramingChannel);
        doc.rect(descriptionStartPoint + 112.5, colorBoxHeight, boxWidth, boxHeight, "F");

        doc.text("Horizontal Framing Channel", descriptionStartPoint + 122, descriptionHeight);
        doc.setFillColor(colorCodes.horizontalFramingChannel);
        doc.rect(descriptionStartPoint + 169, colorBoxHeight, boxWidth, boxHeight, "F");

        doc.text("Horizontal Bars", descriptionStartPoint + 178, descriptionHeight);
        doc.setFillColor(colorCodes.horizontalBars);
        doc.rect(descriptionStartPoint + 205, colorBoxHeight, boxWidth, boxHeight, "F");

        // footer data
        doc.text("Ceiling Height", 15, height + 35);
        doc.text(":", 42, height + 35);
        doc.text(`${data.wallHeight}`, 47, height + 35);

        doc.text("Door Color", 15, height + 51);
        doc.text(":", 42, height + 51);
        doc.text(`${data.door ? data.frameColorCode : "N/A"}`, 47, height + 51);

        doc.text("Frame Color Code", 230, height + 43);
        doc.text(":", 262, height + 43);
        doc.text(`${data.frameColorCode}`, 268, height + 43);

        doc.save(fileName);
        pdfArray.push(fileName);

        // **********     Client Pdf     **********
        const clientDoc = new jsPDF({ orientation: "landscape" });

        // head section
        clientDoc.addImage(iamgeData, "png", 10, 10, 50, 10);

        clientDoc.setFontSize(10);
        clientDoc.text(`Order ID`, 225, 15);
        clientDoc.text(`:`, 250, 15);
        clientDoc.text(`${orderId}`, 255, 15);

        clientDoc.setFontSize(10);
        clientDoc.text(`Product Type`, 225, 20);
        clientDoc.text(`:`, 250, 20);
        clientDoc.text(`${data.product.name}`, 255, 20);

        // main image
        const DPI = 140;

        const imageWidthMM = (data["newImageWidth"] * 25.4) / DPI;
        const imageHeightMM = (data["newImageHeight"] * 25.4) / DPI;

        const imagePageWidth = doc.internal.pageSize.getWidth();

        let xPositionForImg = 15;

        if (imagePageWidth > imageWidthMM + 30) {
            xPositionForImg = (imagePageWidth - imageWidthMM) / 2;
        }

        clientDoc.addImage(data['newImage'], "png", xPositionForImg, marginFromTop + 5, imageWidthMM, imageHeightMM);

        // footer data
        clientDoc.text("Ceiling Height", 15, height + 35);
        clientDoc.text(":", 42, height + 35);
        clientDoc.text(`${data.wallHeight}`, 47, height + 35);

        clientDoc.text("Door Color", 15, height + 51);
        clientDoc.text(":", 42, height + 51);
        clientDoc.text(`${data.door ? data.frameColorCode : "N/A"}`, 47, height + 51);

        clientDoc.text("Frame Color Code", 230, height + 43);
        clientDoc.text(":", 262, height + 43);
        clientDoc.text(`${data.frameColorCode}`, 268, height + 43);

        const RequestObj = req.body.data[0]
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

        clientDoc.addPage([], "landscape")
        clientDoc.setFontSize(14);
        clientDoc.setLineHeightFactor(1.2);
        if(RequestObj["skipThirdStep"] === false) {
            clientDoc.text(
                `Patishon Height: ${RequestObj["wallHeight"]} \n` +
                `Room Width*: ${RequestObj["wallLength"]} \n` +
                `*Recommended opening = (the calculation should be the overall width of the panels and doors + 20mm) \n` +

                `\nGlass Covering: ${RequestObj["glassCovering"]} \n` +
                `Glass Covering price: £${glassCoveringPrice} \n\n` +

                `Door Category: ${RequestObj["newDoor"]?.doorCategory || ''} \n` +
                `Door type: ${RequestObj["newDoor"]?.doorType || ''} \n` +
                (RequestObj["newDoor"]?.doorCategory === 'hinged' ? `Door type of opening: ${RequestObj["newDoor"]?.typeOfOpening} \n` : '') +
                ((RequestObj["newDoor"]?.doorCategory === 'sliding' && RequestObj["newDoor"]?.doorType === 'single') ? `Door direction of opening: ${RequestObj["newDoor"]?.directionOfOpening} \n` : '') +
                ((RequestObj["newDoor"].doorCategory === 'hinged' && RequestObj["newDoor"].doorType === 'single') ? `Door handle position: ${RequestObj["newDoor"]?.handlePosition} \n` : '') +
                `Door size: ${RequestObj["newDoor"]?.doorSize || ''} \n` +
                `Door Style: ${(RequestObj["door"]?.horizontalBars > 0) ? "Framed" : "Frameless"} \n` +
                ((RequestObj["door"]?.horizontalBars > 0) ? `Horizontal Bars: ${RequestObj["door"]?.horizontalBars} \n` : '') +
                `Frame Design: ${RequestObj["numberOfHorizontalFrames"] > 0 ? "Framed" : 'Frameless'} \n` +
                `Door price: £${RequestObj["newDoor"]?.doorPrice || ''} \n\n` +

                (RequestObj["numberOfHorizontalFrames"] > 0 ? `Horizontal Bars for frame: ${RequestObj["numberOfHorizontalFrames"]} \n` : '') +
                `Frame Color: ${RequestObj["frameColorCode"] || ''} \n` +
                `\nPanel Sizes: ${sizesString || ''}` +
                `\nPanel Price: £${panelsPrice + (RequestObj["wallLength"] === panelsPrice ? 20 : 0)}` +

                `\n\nTotal: Panels Price + Door Price + Glass Covering Price = £${panelsPrice + (RequestObj["wallLength"] === panelsPrice ? 20 : 0) + RequestObj["newDoor"]?.doorPrice + glassCoveringPrice}`,
                20, 20);
        } else {
            clientDoc.text(
                `Patishon Height: ${RequestObj["wallHeight"]} \n` +
                `Room Width: ${RequestObj["wallLength"]} \n` +
                `\nGlass Covering: ${RequestObj["glassCovering"]} \n` +
                `Glass Covering price: £${glassCoveringPrice} \n\n` +

                (RequestObj["numberOfHorizontalFrames"] > 0 ? `Horizontal Bars for frame: ${RequestObj["numberOfHorizontalFrames"]} \n` : '') +
                `Frame Color: ${RequestObj["frameColorCode"] || ''} \n` +
                `\nPanel Sizes: ${sizesString || ''}` +
                `\nPanel Price: £${panelsPrice + (RequestObj["wallLength"] === panelsPrice ? 20 : 0)}` +

                `\n\nTotal: Panels Price + Glass Covering Price = £${panelsPrice + (RequestObj["wallLength"] === panelsPrice ? 20 : 0) + glassCoveringPrice}`,
                20, 20);
        }

        clientDoc.save(clientFileName);
        clientPdfArray.push(clientFileName);
    }

    if (req.body.fromCart) await cartSchema.model.deleteMany();
    return res.status(200).json(createSuccessResponse("PDF", clientPdfArray));
};

module.exports = {
    imageAndPdfGenerator
};
