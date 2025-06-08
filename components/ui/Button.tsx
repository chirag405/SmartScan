import React from "react";
import {
  Text,
  TextStyle,
  TouchableOpacity,
  useColorScheme,
  ViewStyle,
} from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "destructive";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  style,
  textStyle,
}) => {
  const colorScheme = useColorScheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: size === "small" ? 16 : size === "large" ? 24 : 20,
      paddingHorizontal: size === "small" ? 16 : size === "large" ? 32 : 24,
      paddingVertical: size === "small" ? 8 : size === "large" ? 16 : 12,
      alignItems: "center",
      justifyContent: "center",
    };

    switch (variant) {
      case "primary":
        return {
          ...baseStyle,
          backgroundColor: disabled ? "#8E8E93" : "#007AFF",
        };
      case "secondary":
        return {
          ...baseStyle,
          backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#F2F2F7",
          borderWidth: 1,
          borderColor: "#007AFF",
        };
      case "destructive":
        return {
          ...baseStyle,
          backgroundColor: disabled ? "#8E8E93" : "#FF3B30",
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: size === "small" ? 14 : size === "large" ? 18 : 16,
      fontWeight: "600",
    };

    switch (variant) {
      case "primary":
        return {
          ...baseStyle,
          color: "#FFFFFF",
        };
      case "secondary":
        return {
          ...baseStyle,
          color: "#007AFF",
        };
      case "destructive":
        return {
          ...baseStyle,
          color: "#FFFFFF",
        };
      default:
        return baseStyle;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};
