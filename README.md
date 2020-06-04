# BTC, ETH & LTC price tracker PWA

## Description

This application is based upon the tutorial written by Medium user: Yomi. You can see it here: [Build a Realtime PWA with React](https://medium.com/better-programming/build-a-realtime-pwa-with-react-99e7b0fd3270).

I have updated the app to use ES6 syntax and React functional components. I also implemented a custom React Hook by Michael Theodorou described in this article: [useStatus: A Custom React Hook for Managing UI States](https://levelup.gitconnected.com/usestatus-a-custom-react-hook-for-managing-ui-states-a5b1bc6555bf).

This project is only intended for personal use and development practice. Thanks to both those developers for putting the articles together!

## Useage

If you would like to run this project yourself:

1. Clone the repository.
2. CD into the directory.
3. Run `npm install`.
4. Create a .env file in the src directory and follow the instructions in the .env.example file.
5. `npm start` to run the project locally.
6. To run the project offline first run `npm build`
7. After the build completes you will be prompted to install 'serve' if it isn't installed.
8. Run `serve -s build` for the project to be served at localhost:5000.
9. The app will now be available at localhost:5000 even after exiting serve.

## Deployment

The app is currently deployed at [this url](https://build-six-delta.now.sh/) through vercel's deployment platform. You can check that out [here](https://vercel.com/).