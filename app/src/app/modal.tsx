import { Text, View, StyleSheet } from "react-native";
import { Link } from "expo-router";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
export default function Modal() {
  return (
    <View style={styles.container}>
      <Text>This is a modal screen.</Text>
      <Link href="/">Go back</Link>
    </View>
  );
}
