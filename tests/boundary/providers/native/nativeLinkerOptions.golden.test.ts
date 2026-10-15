import { expect, it } from "vitest";
import { parseOtoolLoadCommands } from "../../../../src/native/parsers/otool.js";
import { withOtoolMachHeader } from "../../../fixtures/nativeCommands.js";

const command = (index: number, count: number, rows: string) =>
  `Load command ${index}\n cmd LC_LINKER_OPTION\n cmdsize 40\n count ${count}\n${rows}`;

it.each(["\n", "\r\n"])(
  "retains ordered linker options in their own command with %j line endings",
  (eol) => {
    const output = withOtoolMachHeader(
      [
        command(0, 2, " string #1 -framework\n string #2 Foundation"),
        command(1, 1, " string #1 123"),
        command(2, 0, ""),
        command(3, 1, " string #1 "),
        command(4, 1, " string #1  123 "),
      ].join("\n"),
    ).replaceAll("\n", eol);
    expect(parseOtoolLoadCommands(output).commands).toEqual([
      {
        index: 0,
        kind: "LC_LINKER_OPTION",
        fields: {
          cmd: "LC_LINKER_OPTION",
          cmdsize: 40,
          count: 2,
          "string #1": "-framework",
          "string #2": "Foundation",
        },
      },
      {
        index: 1,
        kind: "LC_LINKER_OPTION",
        fields: {
          cmd: "LC_LINKER_OPTION",
          cmdsize: 40,
          count: 1,
          "string #1": "123",
        },
      },
      {
        index: 2,
        kind: "LC_LINKER_OPTION",
        fields: {
          cmd: "LC_LINKER_OPTION",
          cmdsize: 40,
          count: 0,
        },
      },
      {
        index: 3,
        kind: "LC_LINKER_OPTION",
        fields: {
          cmd: "LC_LINKER_OPTION",
          cmdsize: 40,
          count: 1,
          "string #1": "",
        },
      },
      {
        index: 4,
        kind: "LC_LINKER_OPTION",
        fields: {
          cmd: "LC_LINKER_OPTION",
          cmdsize: 40,
          count: 1,
          "string #1": " 123 ",
        },
      },
    ]);
  },
);

it.each([
  [2, " string #1 -framework"],
  [1, " string #1 -framework\n string #2 Foundation"],
  [2, " string #1 -framework\n string #1 Foundation"],
  [2, " string #2 Foundation\n string #1 -framework"],
  [-1, ""],
])("rejects incomplete or ambiguous linker options (%s, %s)", (count, rows) => {
  expect(() =>
    parseOtoolLoadCommands(withOtoolMachHeader(command(0, count, rows))),
  ).toThrow(/linker.option/u);
});
