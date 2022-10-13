## pfWarp
pfWarp is automated alias management tool for pfSense.

## Features
* Automatically create and update aliases for specified ASN's

## Installation
* Clone this repository
* Execute `npm install`
* Copy `.env.example` to `.env` and fill in the required values

## Environment Variables
* `CLIENT_ID` - The client ID of your pfSense API user
* `CLIENT_TOKEN` - The client token of your pfSense API user
* `API_URL` - The hostname or IP address of your pfSense router
* `ASN_LIST` - ASN List, check example file for format

## Usage
* Execute `npm start` to start the application

## License
MIT, see LICENSE file for more information.
