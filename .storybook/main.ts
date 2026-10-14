import { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  // 空配列だと storybook がエラーを吐くので、ダミーの空文字列を入れる
  stories: [""],
  framework: "@storybook/react-vite",
  refs: {
    student: {
      title: "Student",
      url: "http://localhost:6006",
    },
    teacher: {
      title: "Teacher",
      url: "http://localhost:6007",
    },
    ui: {
      title: "UI",
      url: "http://localhost:6008",
    },
  },
};

export default config;
