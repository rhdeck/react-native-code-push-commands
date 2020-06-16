# react-native-code-push-commands

React-native helper commands for code push

## Installation

For react-native projects only.

```bash
yarn add react-ntiave-code-push-commands
```

## Usage

The `react-native` command will now be extended with code-push specific commands.

### react-native code-push-release [options]

Release codepush update

### react-native set-code-push-key [options]

Set codepush key (platform specification required)

### react-native code-push-set-stage [options][stage]

Update all codepush keys to work with their various apps but on the same stage

### react-native code-push-list

List code push apps and stages attached to the deployments of the app.

Note: this will only list the code push deployments added using this tool
