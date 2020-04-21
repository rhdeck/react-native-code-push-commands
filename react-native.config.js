const { release, setKey } = require("./");
const { join } = require("path");
const { readFileSync, writeFileSync } = require("fs");
const packagePath = join(process.cwd(), "package.json");
const releaseIos = async ({
  targetVersion,
  isMandatory,
  description,
  addGithash,
}) => {
  try {
    const {
      codepush: {
        ios: { appName, stage },
      },
    } = JSON.parse(readFileSync(packagePath, { encoding: "utf8" }));
    return release({
      appName,
      stage,
      targetVersion,
      isMandatory,
      description,
      addGithash,
    });
  } catch (e) {
    ("There is no saved ios setting in package.json - this is created when you set the key through 'react-native set-code-push-key'");
  }
};
const releaseAndroid = async ({
  targetVersion,
  isMandatory,
  description,
  addGithash,
}) => {
  try {
    const {
      codepush: {
        ios: { appName, stage },
      },
    } = JSON.parse(readFileSync(packagePath, { encoding: "utf8" }));
    return release({
      appName,
      stage,
      targetVersion,
      isMandatory,
      description,
      addGithash,
    });
  } catch (e) {
    console.error(
      "There is no saved android setting in package.json - this is created when you set the key through 'react-native set-code-push-key'"
    );
  }
};
module.exports = {
  commands: [
    {
      name: "code-push-release",
      description: "Release codepush update",
      options: [
        {
          name: "--ios",
          description: "Set for iOS project (this or --android is required",
        },
        {
          name: "--android",
          description: "Set for Android (this or --ios is required)",
        },
        {
          name: "--app-name [name]",
          description: "Name of application",
          default: "",
        },
        {
          name: "--stage [stage]",
          description: "Deployment Stage",
          default: "",
        },
        {
          name: "--target-version [semver]",
          dsecription:
            "Semver representation of the binary this codepush release goes with (default is current version in package.json)",
        },
        {
          name: "--description [text]",
          description: "Message that goes with this codepush release",
          default: "",
        },
        {
          name: "--add-githash",
          description:
            "Add hash of current git commit into codepush message for automatic tracking",
        },
        {
          name: "--mandatory",
          description: "Release this update as mandatory",
        },
      ],
      func: async (
        _,
        __,
        {
          ios,
          android,
          appName,
          stage,
          description,
          addGithash,
          targetVersion,
          mandatory: isMandatory,
        }
      ) => {
        if (appName && (ios || android)) {
          console.error(
            "--ios and --android and substitutes for selecting the appname - you cannot do both"
          );
          process.exit();
        }
        try {
          if (!appName) {
            if (ios)
              await releaseIos({
                description,
                addGithash,
                targetVersion,
                isMandatory,
              });
            if (android)
              await releaseAndroid({
                description,
                addGithash,
                targetVersion,
                isMandatory,
              });
          } else
            release({
              appName,
              stage,
              description,
              addGithash,
              targetVersion,
              isMandatory,
            });
        } catch (e) {
          console.error(e);
          process.exit(1);
        }
      },
    },
    {
      name: "set-code-push-key [key]",
      description: "Set codepush key (platform specification required)",
      options: [
        {
          name: "--ios",
          description: "Set for iOS project (this or --android is required",
        },
        {
          name: "--android",
          description: "Set for Android (this or --ios is required)",
        },
        {
          name: "--appName [name]",
          description: "Name of application",
          default: "",
        },
        {
          name: "--stage [stage]",
          description: "Deployment Stage",
          default: "",
        },
      ],
      func: async (
        [key],
        _,
        { appName, stage, android, ios, doSave = true }
      ) => {
        try {
          const tempStage = await setKey({ appName, stage, android, ios, key });
          if (doSave && tempStage) {
            const thisStage = stage || tempStage;
            if (appName && typeof stage === "string") {
              //Save this to the string

              let o = JSON.parse(
                readFileSync(packagePath, { encoding: "utf8" })
              );
              let codepush = o.codepush || {};
              if (android) {
                codepush.android = { stage: thisStage, appName };
              }
              if (ios) {
                codepush.ios = { stage: thisStage, appName };
              }
              writeFileSync(packagePath, JSON.stringify(o, null, 2));
            }
          }
          console.log("Success!");
        } catch (e) {
          console.error(e);
          process.exit(1);
        }
      },
    },
  ],
};
