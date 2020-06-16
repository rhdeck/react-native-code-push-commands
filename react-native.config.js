const { release, getKey, saveToBinary, saveToPackage } = require("./");
const { join } = require("path");
const { readFileSync } = require("fs");
const packagePath = join(process.cwd(), "package.json");
const releaseIos = async ({
  targetVersion,
  isMandatory,
  description,
  addGithash,
}) => {
  console.log("starting releaseios");
  let appName, deployment;
  try {
    var {
      codepush: { ios },
    } = JSON.parse(readFileSync(packagePath, { encoding: "utf8" }));
    appName = ios.appName;
    deployment = ios.deployment;
  } catch (e) {
    console.error(
      "There is no saved ios setting in package.json - this is created when you set the key through 'react-native set-code-push-key'"
    );
  }
  console.log("we will try to get to release");
  return release({
    appName,
    deployment,
    targetVersion,
    isMandatory,
    description,
    addGithash,
  });
};
const releaseAndroid = async ({
  targetVersion,
  isMandatory,
  description,
  addGithash,
}) => {
  let appName, deployment;
  try {
    var {
      codepush: { ios },
    } = JSON.parse(readFileSync(packagePath, { encoding: "utf8" }));
    appName = ios.appName;
    deployment = ios.deployment;
  } catch (e) {
    console.error(
      "There is no saved android setting in package.json - this is created when you set the key through 'react-native set-code-push-key'"
    );
  }
  return release({
    appName,
    deployment,
    targetVersion,
    isMandatory,
    description,
    addGithash,
  });
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
          name: "--deployment [deployment]",
          description: "Deployment name",
          default: "",
        },
        {
          name: "--target-version [semver]",
          description:
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
          deployment,
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
            if (deployment) {
              if (ios) {
                const out = await getKey({ ios, deployment });
                if (out) {
                  console.log("lets destructure", out);
                  const { key, appName } = out;
                  saveToBinary({ ios, key });
                  saveToPackage({ ios, deployment, appName });
                }
              }
              if (android) {
                const out = await getKey({ android, deployment });
                if (out) {
                  const { key, appName } = out;
                  saveToBinary({ android, key });
                  saveToPackage({ android, deployment, appName });
                }
              }
            }
            if (!ios && !android) {
              console.error("Must specify --ios and/or --android");
              process.exit(1);
            }
            const errors = [];
            if (ios) {
              try {
                await releaseIos({
                  description,
                  addGithash,
                  targetVersion,
                  isMandatory,
                });
              } catch (e) {
                errors.push(e);
              }
            }
            if (android) {
              try {
                await releaseAndroid({
                  description,
                  addGithash,
                  targetVersion,
                  isMandatory,
                });
              } catch (e) {
                errors.push(e);
              }
            }
            if (errors.length) {
              console.error(
                errors.length + " processes failed. Exiting with error signal"
              );
            }
          } else
            release({
              appName,
              deployment,
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
      name: "set-code-push-key ",
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
          name: "--deployment [deployment]",
          description: "Deployment name",
          default: "",
        },
      ],
      func: async (
        __,
        _,
        { appName, deployment, android, ios, doSave = true }
      ) => {
        try {
          if (!ios && !android) console.error("Must choose --ios or --android");
          if (ios && android)
            console.error("--ios and --android options are mutually exclusive");
          const out = await getKey({ appName, deployment, android, ios });
          if (out) {
            const { key } = out;
            saveToBinary({ android, ios, key, deployment, android });
            saveToPackage({ android, ios, deployment, appName });
            console.log("Success!");
          }
        } catch (e) {
          console.error(e);
          process.exit(1);
        }
      },
    },
    {
      name: "code-push-set-deployment [deployment]",
      description:
        "Update all codepush tokens to the same deployment of their respective apps (e.g. test-3 or the like)",
      options: [
        {
          name: "--ios",
          description: "update IOS deployment",
        },
        {
          name: "--android",
          description: "update Android deployment",
        },
      ],
      func: async ([deployment], __, { ios, android }) => {
        if (ios) {
          const { key, appName } = await getKey({ ios, deployment });
          saveToBinary({ ios, key });
          saveToPackage({ ios, deployment, appName });
        }
        if (android) {
          const { key, appName } = await getKey({ android, deployment });
          saveToBinary({ android, key });
          saveToPackage({ android, deployment, appName });
        }
      },
    },
    {
      name: "code-push-list",
      description: "List code push apps and deployments attached to this app",
      func: () => {
        const { codepush } = JSON.parse(
          readFileSync(join(process.cwd(), "package.json"))
        );
        console.log(JSON.stringify(codepush, null, 2));
      },
    },
  ],
};
