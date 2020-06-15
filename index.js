const { join } = require("path");
const { spawnSync, execSync } = require("child_process");
const {
  android: { setString },
  ios: { setPlistValue },
} = require("@raydeck/react-native-utilities");
const getCommitHash = () =>
  execSync("git log -1").toString().split("\n").shift();
const release = async ({
  appName,
  stage,
  description,
  addGithash,
  targetVersion,
  isMandatory = false,
}) => {
  if (!targetVersion)
    targetVerison = require(join(process.cwd(), "package.json")).version;
  const descriptionOut = [description, addGithash && getCommitHash()]
    .filter(Boolean)
    .join("\n\n");
  let cmd = `appcenter codepush release-react -a ${appName} -d ${stage} -t ${version} --description '${descriptionOut}'`;
  if (isMandatory) cmd += ` -m`;
  execSync(cmd, { stdio: "inherit" });
};

const setKey = async ({
  appName,
  stage,
  android,
  ios,
  key,
  path = process.cwd(),
}) => {
  if (!android && !ios) {
    throw "Must specify android or ios for setting the key";
  }
  if (!key) {
    // if (!stage || !appName)
    //   throw "Either key or [appname, stage] is required to set the key";
    if (!key) {
      if (!appName) {
        //List appnames
        const { output } = spawnSync(
          "yarn",
          ["-s", "appcenter", "apps", "list", "--output", "json"],
          { stdio: "pipe", encoding: "utf8" }
        );
        const a = JSON.parse([output[0], output[1]].filter(Boolean).join(""));
        if (a.length > 1) {
          console.log(
            "Problem: appName not specified - try running with one of these names"
          );
          console.log(
            a
              .map(
                ({ name, owner: { name: ownerName } }) =>
                  "\t react-native set-code-push-key " +
                  (ios ? " --ios" : "") +
                  (android ? " --android" : "") +
                  " --appName " +
                  [ownerName, name].join("/")
              )
              .join("\n")
          );
          return;
        } else {
          const {
            name,
            owner: { name: ownerName },
          } = a.pop();
          appName = [ownerName, name].join("/");
        }
      }
      const { output: output2 } = spawnSync(
        "yarn",
        [
          "-s",
          "appcenter",
          "codepush",
          "deployment",
          "list",
          "-k",
          "--app",
          appName,
          "--output",
          "json",
        ],
        { stdio: "pipe", encoding: "utf8" }
      );
      if (!output2) {
        throw "Could not find codepush stages for app " + appName;
      }
      const a2 = JSON.parse([output2[0], output2[1]].filter(Boolean).join(""));
      if (stage) {
        const myStage = a2.find(([thisStage, key]) => thisStage === stage);
        if (myStage) {
          key = myStage[1];
        } else {
          throw "This stage does not exist in the app " + appName;
        }
      } else if (a2.length > 1) {
        console.log(
          "Problem: stage not specified, and there is more than one. Try using:"
        );
        console.log(
          a2
            .map(
              ([stage]) =>
                "\treact-native set-code-push-key --appName " +
                appName +
                " --stage " +
                stage +
                (ios ? " --ios" : "") +
                (android ? " --android" : "")
            )
            .join("\n")
        );
        return;
      } else {
        const [[, newKey]] = stages;
        key = newKey;
      }
    }
    if (key) {
      if (android) await setString("CodePushDeploymentKey", key, path);
      if (ios) setPlistValue("CodePushDeploymentKey", key, path);
    }
    return stage || true;
  }
};
module.exports = { setKey, release };
