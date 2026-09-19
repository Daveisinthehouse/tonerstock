# Toner Stock

HP and Kyocera toner inventory web app.

## Planned production architecture
- iPhone camera barcode scanning with continuous scan mode
- Shared inventory database for multi-device access
- GitHub repository for application code and versioned toner catalogue
- CSV export
- HP/Kyocera catalogue kept separately from live stock counts

## Important
GitHub is used for the source/catalogue. Live inventory counts should use an authenticated database/API rather than browser localStorage or a GitHub token exposed to the browser.

## Catalogue
See data/catalog.json for the initial manufacturer-code catalogue. These are manufacturer supply/part numbers; they are not a claim that every code is an EAN/UPC barcode.
