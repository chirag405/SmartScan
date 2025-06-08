import React from "react";
import { View, ViewStyle, useColorScheme } from "react-native";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 16,
}) => {
  const colorScheme = useColorScheme();

  return (
    <View
      style={[
        {
          backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF",
          borderRadius: 12,
          padding,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
