const { join } = require("path");
const { spawnSync, execSync } = require("child_process");
const {
  android: { setString },
  ios: { setPlistValue },
} = require("@raydeck/react-native-utilities");
const { readFileSync, writeFileSync } = require("fs");
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
    targetVersion = require(join(process.cwd(), "package.json")).version;
  const descriptionOut = [description, addGithash && getCommitHash()]
    .filter(Boolean)
    .join("\n\n");
  let cmd = `yarn -s appcenter codepush release-react -a ${appName} -d ${stage} -t ${targetVersion} --description '${descriptionOut}'`;
  if (isMandatory) cmd += ` -m`;
  console.log("running ", cmd);
  execSync(cmd, { stdio: "inherit" });
};
const getKey = async ({
  appName,
  stage,
  android,
  ios,
  path = process.cwd(),
}) => {
  if (!android && !ios) {
    throw "Must specify android or ios for setting the key";
  }
  let key;
  if (!appName && !stage) {
    //List appnames
    const { output } = spawnSync(
      "npx",
      ["appcenter", "apps", "list", "--output", "json"],
      { stdio: "pipe", encoding: "utf8" }
    );
    const a = JSON.parse([output[0], output[1]].filter(Boolean).join(""));
    if (a.length > 1) {
      console.log(
        "Problem: appName not specified - try running with one of these names"
      );
      console.log(
        a
          .filter(
            ({ os }) => (ios && os === "iOS") || (android && os === "Android")
          )
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
  } else if (!appName) {
    const o = JSON.parse(readFileSync(join(path, "package.json")));
    const { codepush } = o;
    if (ios) appName = codepush.ios.appName;
    if (android) appName = codepush.android.appName;
  }
  const { output: output2 } = spawnSync(
    "npx",
    [
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
  return { appName, key, stage, ios, android };
};
const saveToBinary = async ({ android, ios, key, path = process.cwd() }) => {
  if (android) await setString("CodePushDeploymentKey", key, path);
  if (ios) setPlistValue("CodePushDeploymentKey", key, path);
};
const saveToPackage = ({
  android,
  ios,
  stage,
  appName,
  path = process.cwd(),
}) => {
  const packagePath = join(path, "package.json");
  let o = JSON.parse(readFileSync(packagePath, { encoding: "utf8" }));
  let codepush = o.codepush || {};
  if (android) {
    codepush.android = { stage, appName };
  }
  if (ios) {
    codepush.ios = { stage, appName };
  }
  o.codepush = codepush;
  writeFileSync(packagePath, JSON.stringify(o, null, 2));
};
module.exports = { getKey, saveToBinary, release, saveToPackage };
