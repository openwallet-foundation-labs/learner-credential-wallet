To setup the development environment for Android on linux (Ubuntu 20.04), follow these steps:

## Requirements :scroll:

Your machine should have [Npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm), [React Native](https://reactnative.dev/docs/environment-setup) installed.

_Note: Preferable versions_

|      | Version |
| ---- | ------- |
| node | 16.13   |
| java | 11      |

It is recommended to use nvm for managing multiple node version: https://github.com/nvm-sh/nvm

- Check the node and npm version by running following commands.

```sh
node -v
npm -v
```

For React Native environment:

- Choose the "React Native CLI Quickstart" tab at the top
- and select "linux" and "android" underneath.

## Installation Steps :walking:

### 1. Fork it :fork_and_knife:

You can get your own fork/copy of [Learning-Credential-Wallet](https://github.com/digitalcredentials/learner-credential-wallet) by using the <kbd><b>Fork</b></kbd> button.

### 2. Clone it :busts_in_silhouette:

You need to clone (download) it to a local machine using

```sh
git clone https://github.com/Your_Username/learner-credential-wallet.git
```

> This makes a local copy of the repository in your machine.

Once you have cloned the `learner-credential-wallet` repository in GitHub, move to that folder first using the change directory command.

This will change directory to a folder

```sh
cd learner-credential-wallet
```

Move to this folder for all other commands.

### 3. Set it up :arrow_up:

Run the following commands to see that _your local copy_ has a reference to _your forked remote repository_ in GitHub :octocat:

```sh
git remote -v
```

By running the above command, you can see that the local copy has a reference to the forked remote repository in GitHub.

```
origin  https://github.com/Your_Username/learner-credential-wallet.git (fetch)
origin  https://github.com/Your_Username/learner-credential-wallet.git (push)
```

### 4. Run it :checkered_flag:

- Install dependencies

```
npm install
```

- Run application in dev environment

```
npm start
npm run android
```

In the future it would be a good idea to use docker for building the app to isolate the developer's system from possibly malicious code installed through dependencies. This could possibly work: https://github.com/react-native-community/docker-android
