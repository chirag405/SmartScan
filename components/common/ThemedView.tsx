import React from "react";
import { View, type ViewProps, useColorScheme } from "react-native";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export const ThemedView: React.FC<ThemedViewProps> = ({
  style,
  lightColor,
  darkColor,
  ...otherProps
}) => {
  const colorScheme = useColorScheme();
  const backgroundColor =
    colorScheme === "dark" ? darkColor || "#000000" : lightColor || "#FFFFFF";

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
};
