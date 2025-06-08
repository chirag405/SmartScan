import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../stores/authStore";
import { useDocumentStore } from "../../stores/documentStore";

interface ProfileCardProps {
  name: string;
  email: string;
  memberSince: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  email,
  memberSince,
}) => {
  const colorScheme = useColorScheme();

  return (
    <View
      style={[
        styles.profileCard,
        { backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF" },
      ]}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.profileInfo}>
        <Text
          style={[
            styles.profileName,
            { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
          ]}
        >
          {name}
        </Text>
        <Text
          style={[
            styles.profileEmail,
            { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
          ]}
        >
          {email}
        </Text>
        <Text
          style={[
            styles.memberSince,
            { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
          ]}
        >
          Member since: {memberSince}
        </Text>
      </View>
    </View>
  );
};

interface StatItemProps {
  label: string;
  value: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value }) => {
  const colorScheme = useColorScheme();

  return (
    <View style={styles.statItem}>
      <Text
        style={[
          styles.statLabel,
          { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
        ]}
      >
        {label}:
      </Text>
      <Text
        style={[
          styles.statValue,
          { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
        ]}
      >
        {value}
      </Text>
    </View>
  );
};

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress?: () => void;
  showChevron?: boolean;
  textColor?: string;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  onPress,
  showChevron = true,
  textColor,
}) => {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity
      style={[
        styles.settingsItem,
        { backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF" },
      ]}
      onPress={onPress}
    >
      <View style={styles.settingsItemLeft}>
        <Ionicons name={icon} size={20} color={textColor || "#007AFF"} />
        <Text
          style={[
            styles.settingsItemTitle,
            {
              color:
                textColor || (colorScheme === "dark" ? "#FFFFFF" : "#000000"),
            },
          ]}
        >
          {title}
        </Text>
      </View>
      {showChevron && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colorScheme === "dark" ? "#8E8E93" : "#8E8E93"}
        />
      )}
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const { user, userProfile, signOut, loading, loadUserProfile } =
    useAuthStore();
  const { stats, fetchUserStats } = useDocumentStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      await fetchUserStats(user.id);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUserProfile(), loadData()]);
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    Alert.alert(
      "Edit Profile",
      "Edit profile functionality will be implemented here."
    );
  };

  const handleNotifications = () => {
    Alert.alert(
      "Notifications",
      "Notification settings will be implemented here."
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      "Privacy & Security",
      "Privacy settings will be implemented here."
    );
  };

  const handleAppPreferences = () => {
    Alert.alert("App Preferences", "App preferences will be implemented here.");
  };

  const handleHelp = () => {
    Alert.alert("Help & Support", "Help and support will be implemented here.");
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            console.log("User initiated sign out from profile");
            await signOut();
            // Navigation will be handled by the auth state change in the main index
          } catch (error) {
            console.error("Sign out error from profile:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  if (!user) {
    return null; // This shouldn't happen as we're in protected tabs
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatStorageSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(0)} KB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colorScheme === "dark" ? "#000000" : "#F2F2F7" },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Card */}
        <View style={styles.section}>
          <ProfileCard
            name={
              userProfile?.full_name || user.user_metadata?.full_name || "User"
            }
            email={user.email}
            memberSince={formatDate(userProfile?.created_at || null)}
          />
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
            ]}
          >
            Account Statistics
          </Text>
          <View
            style={[
              styles.statsCard,
              {
                backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF",
              },
            ]}
          >
            <StatItem
              label="Documents Uploaded"
              value={`${stats?.totalDocuments || 0}`}
            />
            <StatItem
              label="Documents Processed"
              value={`${stats?.processedDocuments || 0}`}
            />
            <StatItem
              label="Storage Used"
              value={formatStorageSize(stats?.storageUsedMB || 0)}
            />
            <StatItem
              label="Subscription"
              value={userProfile?.subscription_tier || "Free"}
            />
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
            ]}
          >
            Account Settings
          </Text>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="person-outline"
              title="Edit Profile"
              onPress={handleEditProfile}
            />
            <SettingsItem
              icon="notifications-outline"
              title="Notifications"
              onPress={handleNotifications}
            />
            <SettingsItem
              icon="shield-outline"
              title="Privacy & Security"
              onPress={handlePrivacy}
            />
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
            ]}
          >
            App Settings
          </Text>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="settings-outline"
              title="App Preferences"
              onPress={handleAppPreferences}
            />
            <SettingsItem
              icon="help-circle-outline"
              title="Help & Support"
              onPress={handleHelp}
            />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="log-out-outline"
              title="Sign Out"
              onPress={handleSignOut}
              showChevron={false}
              textColor="#FF3B30"
            />
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.section}>
          <Text
            style={[
              styles.versionText,
              { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
            ]}
          >
            SmartScan v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  profileCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  profileInfo: {
    alignItems: "center",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    marginBottom: 8,
  },
  memberSince: {
    fontSize: 14,
  },
  statsCard: {
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingsCard: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsItemTitle: {
    fontSize: 16,
    marginLeft: 12,
  },
  versionText: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 20,
    marginBottom: 40,
  },
});
