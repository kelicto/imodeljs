/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { EOL } from "os";
import * as path from "path";
import { Logger, LogLevel } from "@bentley/bentleyjs-core";
import { BackendLoggerCategory, IModelHost } from "@bentley/imodeljs-backend";
import { CloneIModel } from "./Clone";
import { CloneRepositoryModel } from "./CloneRepositoryModel";
import { CloneNonPhysical } from "./CloneNonPhysical";
import { SubCategoryFilterer } from "./SubCategoryFilterer";

(async () => { // eslint-disable-line @typescript-eslint/no-floating-promises
  await IModelHost.startup();
  // initialize logging
  Logger.initializeToConsole();
  Logger.setLevelDefault(LogLevel.Error);
  Logger.setLevel("Progress", LogLevel.Info);
  if (false) {
    Logger.setLevel(BackendLoggerCategory.IModelExporter, LogLevel.Trace);
    Logger.setLevel(BackendLoggerCategory.IModelImporter, LogLevel.Trace);
    Logger.setLevel(BackendLoggerCategory.IModelTransformer, LogLevel.Trace);
  }

  if (true) {
    let sourceFileName: string;
    let targetFileName: string;
    if (true) {
      sourceFileName = "D:/data/bim/snapshots/467d20b7-cf9b-4407-9052-237790253db7.bim";
      targetFileName = path.join(__dirname, "fmg-clone.bim");
    } else {
      sourceFileName = "D:/data/bim/snapshots/shell4.bim";
      targetFileName = path.join(__dirname, "shell4-clone.bim");
    }
    process.stdout.write(`CloneIModel ${sourceFileName} --> ${targetFileName}${EOL}`);
    await CloneIModel.clone(sourceFileName, targetFileName);
  } else if (true) {
    const sourceFileName = "D:/data/bim/snapshots/shell-full-1015.bim";
    const targetFileName = path.join(__dirname, "shell-filtered.bim");
    await SubCategoryFilterer.filter(sourceFileName, targetFileName);
  } else {
    const sourceFileName = "D:/data/bim/snapshots/467d20b7-cf9b-4407-9052-237790253db7.bim";
    const targetFileName1 = path.join(__dirname, "fmg-repository-model.bim");
    process.stdout.write(`CloneRepositoryModel ${sourceFileName} --> ${targetFileName1}${EOL}`);
    await CloneRepositoryModel.clone(sourceFileName, targetFileName1);
    const targetFileName2 = path.join(__dirname, "fmg-non-physical.bim");
    process.stdout.write(`CloneNonPhysical ${sourceFileName} --> ${targetFileName2}${EOL}`);
    await CloneNonPhysical.clone(sourceFileName, targetFileName2);
  }
  await IModelHost.shutdown();
})();