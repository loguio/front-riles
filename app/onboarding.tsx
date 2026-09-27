import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Feather,
  Ionicons,
  FontAwesome,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
} from "../src/constants/theme";
import { OnboardingProgress } from "../src/components/onboarding/OnboardingProgress";
import { useApp } from "../src/context/AppContext";
import { useAuth, formatAuthError } from "../src/context/AuthContext";
import { SportType, ConnectedApp } from "../src/types";
import { onboardingService } from "../src/services";
import { CONNECTED_APPS_CATALOG } from "../src/mock/mockData";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInWithDemoAccount,
    signOut,
    session,
  } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [authMethod, setAuthMethod] = useState<string | null>(null);
  const [goalText, setGoalText] = useState<string>(
    "Me préparer pour mon premier semi-marathon sans me blesser",
  );
  const [selectedSports, setSelectedSports] = useState<SportType[]>([
    "running",
  ]);
  const [connectedAppIds, setConnectedAppIds] = useState<string[]>([
    "garmin",
    "strava",
  ]);
  const [appsCatalog, setAppsCatalog] = useState<ConnectedApp[]>(
    CONNECTED_APPS_CATALOG,
  );
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro">("pro");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // État du modal Email / Mot de passe Supabase
  const [isEmailModalVisible, setIsEmailModalVisible] =
    useState<boolean>(false);
  const [emailMode, setEmailMode] = useState<"login" | "register">("register");
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [fullNameInput, setFullNameInput] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [authInfoMessage, setAuthInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadApps() {
      try {
        const apps = await onboardingService.getAppsCatalog();
        setAppsCatalog(apps);
      } catch (err) {
        console.warn("Failed to load apps catalog:", err);
      }
    }
    loadApps();
  }, []);

  // Handlers Supabase Auth
  const handleAppleAuth = async () => {
    try {
      setAuthLoading(true);
      setAuthErrorMessage(null);
      setAuthMethod("apple");
      const result = await signInWithApple();

      if (result.error) {
        // Si Apple n'est pas encore configuré sur la console Supabase, fallback transparent démo Apple
        if (
          result.error.message?.includes("provider is not enabled") ||
          result.error.message?.includes("unsupported provider")
        ) {
          const demoRes = await signInWithDemoAccount("apple");
          if (demoRes.session) {
            setAuthMethod("apple");
            setStep(2);
            return;
          }
        }
        setAuthErrorMessage(formatAuthError(result.error));
        return;
      }

      // Si l'utilisateur a annulé la popup
      if (result.cancelled) {
        return;
      }

      // Si la session est confirmée
      if (result.session) {
        setStep(2);
      }
    } catch (err: any) {
      setAuthErrorMessage(formatAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setAuthLoading(true);
      setAuthErrorMessage(null);
      setAuthMethod("google");
      const result = await signInWithGoogle();

      if (result.error) {
        setAuthErrorMessage(formatAuthError(result.error));
        return;
      }

      // Si l'utilisateur a fermé ou annulé la fenêtre
      if (result.cancelled) {
        return;
      }

      // Si la session est confirmée
      if (result.session) {
        setStep(2);
      }
    } catch (err: any) {
      setAuthErrorMessage(formatAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSkipAuth = () => {
    setAuthMethod("test");
    setAuthErrorMessage(null);
    setStep(2);
  };

  const handleEmailSubmit = async () => {
    if (!emailInput.trim() || !passwordInput) {
      setAuthErrorMessage("Veuillez renseigner votre email et mot de passe.");
      return;
    }
    if (passwordInput.length < 6) {
      setAuthErrorMessage(
        "Le mot de passe doit comporter au moins 6 caractères.",
      );
      return;
    }

    try {
      setAuthLoading(true);
      setAuthErrorMessage(null);
      setAuthInfoMessage(null);

      if (emailMode === "login") {
        const { error, session: s } = await signInWithEmail(
          emailInput,
          passwordInput,
        );
        if (error) {
          setAuthErrorMessage(formatAuthError(error));
          return;
        }
        if (s) {
          setAuthMethod("email");
          setIsEmailModalVisible(false);
          setStep(2);
        }
      } else {
        const { error, session: s } = await signUpWithEmail(
          emailInput,
          passwordInput,
          fullNameInput.trim() || undefined,
        );
        if (error) {
          setAuthErrorMessage(formatAuthError(error));
          return;
        }
        if (s) {
          setAuthMethod("email");
          setIsEmailModalVisible(false);
          setStep(2);
        }
      }
    } catch (err: any) {
      setAuthErrorMessage(formatAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 3: Sport toggle
  const toggleSport = (sport: SportType) => {
    if (selectedSports.includes(sport)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== sport));
      }
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  // Step 4: App connection toggle
  const toggleApp = (appId: string) => {
    if (connectedAppIds.includes(appId)) {
      setConnectedAppIds(connectedAppIds.filter((id) => id !== appId));
    } else {
      setConnectedAppIds([...connectedAppIds, appId]);
    }
  };

  // Step Navigation avec synchronisation API
  const handleNext = async () => {
    // Synchronise l'étape courante en arrière-plan
    onboardingService
      .saveStepData({
        currentStep: step,
        authMethod: (authMethod as any) || "apple",
        mainGoal: goalText,
        selectedSports,
        connectedApps: connectedAppIds,
        selectedPlan,
      })
      .catch((e) => console.warn("Background step save:", e));

    if (step < 5) {
      setStep(step + 1);
    } else {
      await handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    try {
      setIsSubmitting(true);
      await completeOnboarding({
        currentStep: 5,
        authMethod: (authMethod as any) || "apple",
        mainGoal: goalText,
        selectedSports,
        connectedApps: connectedAppIds,
        selectedPlan,
        isCompleted: true,
      });
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. Header Progress Bar */}
      <OnboardingProgress currentStep={step} totalSteps={5} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 24) + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Card Container */}
        <View style={styles.cardContainer}>
          <Text style={styles.stepSubtitle}>ÉTAPE {step} SUR 5</Text>

          {/* ================= STEP 1: AUTH ================= */}
          {step === 1 && (
            <View>
              <Text style={styles.title}>Sauvegarde ton{"\n"}plan</Text>
              <Text style={styles.description}>
                Crée ton espace personnel pour retrouver tes séances partout.
              </Text>

              {authErrorMessage && (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{authErrorMessage}</Text>
                </View>
              )}

              {session && (
                <View style={styles.connectedCard}>
                  <View style={styles.connectedHeaderRow}>
                    <View style={styles.connectedAvatarCircle}>
                      <Feather name="check" size={18} color="#16A34A" />
                    </View>
                    <View style={styles.connectedTextCol}>
                      <Text style={styles.connectedBadgeText}>
                        SESSION ACTIVE
                      </Text>
                      <Text style={styles.connectedEmailText}>
                        {session.user?.email || "Compte connecté"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.switchAccountBtn}
                      activeOpacity={0.7}
                      onPress={async () => {
                        await signOut();
                      }}
                    >
                      <Feather
                        name="log-out"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.switchAccountText}>Déconnexion</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Apple Auth */}
              <TouchableOpacity
                style={styles.appleBtn}
                activeOpacity={0.88}
                disabled={authLoading}
                onPress={handleAppleAuth}
              >
                {authLoading && authMethod === "apple" ? (
                  <ActivityIndicator size="small" color={Colors.textWhite} />
                ) : (
                  <>
                    <FontAwesome
                      name="apple"
                      size={22}
                      color={Colors.textWhite}
                      style={styles.authIcon}
                    />
                    <Text style={styles.appleBtnText}>
                      Continuer avec Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Google Auth */}
              <TouchableOpacity
                style={styles.googleBtn}
                activeOpacity={0.88}
                disabled={authLoading}
                onPress={handleGoogleAuth}
              >
                {authLoading && authMethod === "google" ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <FontAwesome
                      name="google"
                      size={18}
                      color="#4285F4"
                      style={styles.authIcon}
                    />
                    <Text style={styles.googleBtnText}>
                      Continuer avec Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.orDividerRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>ou</Text>
                <View style={styles.orLine} />
              </View>

              {/* Email option */}
              <TouchableOpacity
                style={styles.emailOptionBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setAuthErrorMessage(null);
                  setIsEmailModalVisible(true);
                }}
              >
                <Text style={styles.emailOptionText}>
                  Continuer avec email et mot de passe
                </Text>
              </TouchableOpacity>

              {/* Skip / Passer la connexion (Phase de Test) */}
              <TouchableOpacity
                style={styles.skipAuthBtn}
                activeOpacity={0.8}
                onPress={handleSkipAuth}
              >
                <Feather
                  name="arrow-right-circle"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.skipAuthBtnText}>
                  Passer la connexion (Mode Test)
                </Text>
              </TouchableOpacity>

              <Text style={styles.termsText}>
                En continuant, tu acceptes les{" "}
                <Text style={styles.termsLink}>conditions d'utilisation</Text>.
              </Text>
            </View>
          )}

          {/* ================= STEP 2: GOAL ================= */}
          {step === 2 && (
            <View>
              <Text style={styles.title}>Parle-nous de ton{"\n"}objectif</Text>
              <Text style={styles.description}>
                Décris ce que tu veux accomplir. Ton coach IA s'appuiera dessus
                pour construire un programme vraiment personnel.
              </Text>

              <Text style={styles.inputLabel}>Ton objectif principal</Text>

              <View style={styles.textInputCard}>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={2}
                  maxLength={120}
                  placeholder="Ex. Me préparer pour mon premier semi-marathon sans me blesser"
                  placeholderTextColor={Colors.textMuted}
                  value={goalText}
                  onChangeText={setGoalText}
                />
              </View>

              <View style={styles.lockRow}>
                <Feather name="lock" size={14} color={Colors.textMuted} />
                <Text style={styles.lockCaption}>
                  Deux lignes maximum, juste avec tes mots.
                </Text>
              </View>
            </View>
          )}

          {/* ================= STEP 3: SPORTS ================= */}
          {step === 3 && (
            <View>
              <Text style={styles.title}>
                Quels sports veux-{"\n"}tu ajouter ?
              </Text>
              <Text style={styles.description}>
                Sélectionne une ou plusieurs disciplines pour ton programme. Tu
                pourras en ajouter d'autres plus tard.
              </Text>

              {/* Sport 1: Running */}
              <TouchableOpacity
                style={[
                  styles.sportCard,
                  selectedSports.includes("running") &&
                    styles.sportCardSelected,
                ]}
                activeOpacity={0.8}
                onPress={() => toggleSport("running")}
              >
                <Text
                  style={[
                    styles.sportTitle,
                    selectedSports.includes("running") &&
                      styles.sportTitleSelected,
                  ]}
                >
                  Course à pied
                </Text>
                {selectedSports.includes("running") && (
                  <Feather name="check" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>

              {/* Sport 2: Swimming */}
              <TouchableOpacity
                style={[
                  styles.sportCard,
                  selectedSports.includes("swimming") &&
                    styles.sportCardSelected,
                ]}
                activeOpacity={0.8}
                onPress={() => toggleSport("swimming")}
              >
                <Text
                  style={[
                    styles.sportTitle,
                    selectedSports.includes("swimming") &&
                      styles.sportTitleSelected,
                  ]}
                >
                  Natation
                </Text>
                {selectedSports.includes("swimming") && (
                  <Feather name="check" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>

              {/* Sport 3: Cycling */}
              <TouchableOpacity
                style={[
                  styles.sportCard,
                  selectedSports.includes("cycling") &&
                    styles.sportCardSelected,
                ]}
                activeOpacity={0.8}
                onPress={() => toggleSport("cycling")}
              >
                <Text
                  style={[
                    styles.sportTitle,
                    selectedSports.includes("cycling") &&
                      styles.sportTitleSelected,
                  ]}
                >
                  Vélo
                </Text>
                {selectedSports.includes("cycling") && (
                  <Feather name="check" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ================= STEP 4: CONNECT APPS ================= */}
          {step === 4 && (
            <View>
              <Text style={styles.title}>Connecte tes{"\n"}applis</Text>
              <Text style={styles.description}>
                Importe tes entraînements depuis ta montre ou ton application
                préférée.
              </Text>

              {/* 2x3 Grid */}
              <View style={styles.appsGrid}>
                {appsCatalog.map((app) => {
                  const isConnected = connectedAppIds.includes(app.id);

                  return (
                    <TouchableOpacity
                      key={app.id}
                      style={[
                        styles.appCard,
                        isConnected && styles.appCardConnected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => toggleApp(app.id)}
                    >
                      <View style={styles.appCardContent}>
                        <View
                          style={[
                            styles.appIconCircle,
                            { backgroundColor: app.color },
                          ]}
                        >
                          <Text style={styles.appIconLetter}>{app.code}</Text>
                        </View>

                        <View style={styles.appTextCol}>
                          <Text style={styles.appName}>{app.name}</Text>
                          <Text
                            style={[
                              styles.appStatusLabel,
                              isConnected && styles.appStatusConnected,
                            ]}
                          >
                            {isConnected ? "Connecté ✓" : "Connecter"}
                          </Text>
                        </View>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={isConnected ? Colors.primary : Colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Skip option */}
              <TouchableOpacity
                style={styles.skipStepBtn}
                activeOpacity={0.7}
                onPress={handleNext}
              >
                <Text style={styles.skipStepText}>
                  Passer cette étape pour le moment
                </Text>
                <Feather name="arrow-right" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* ================= STEP 5: PLAN SELECTION ================= */}
          {step === 5 && (
            <View>
              <Text style={styles.title}>
                Choisis ton mode{"\n"}d'entraînement
              </Text>
              <Text style={styles.description}>
                Commence simplement. Tu pourras changer de mode à tout moment.
              </Text>

              {/* Option 1: Basique */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === "basic" && styles.planCardActive,
                ]}
                activeOpacity={0.88}
                onPress={() => setSelectedPlan("basic")}
              >
                <View style={styles.planHeaderRow}>
                  <Text style={styles.planTitle}>Basique</Text>
                  <Text style={styles.planFreeText}>Gratuit</Text>
                </View>
                <Text style={styles.planDescription}>
                  Plan statique standard, synchronisation des sorties.
                </Text>
              </TouchableOpacity>

              {/* Option 2: Pro Adaptatif */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  styles.planCardPro,
                  selectedPlan === "pro" && styles.planCardProActive,
                ]}
                activeOpacity={0.88}
                onPress={() => setSelectedPlan("pro")}
              >
                {/* Recommandé badge pill */}
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Recommandé</Text>
                </View>

                <View style={styles.planHeaderRow}>
                  <Text style={styles.planTitle}>Pro Adaptatif</Text>
                  <Text style={styles.planOfferText}>14 jours offerts</Text>
                </View>
                <Text style={styles.planDescription}>
                  Coach IA illimité, arbitrage de fatigue en langage naturel,
                  replanification dynamique.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ================= STEP BOTTOM ACTIONS ================= */}
          {step > 1 && step < 5 && (
            <View style={styles.bottomNavRow}>
              <TouchableOpacity
                style={styles.backBtn}
                activeOpacity={0.7}
                onPress={handleBack}
              >
                <Feather
                  name="arrow-left"
                  size={18}
                  color={Colors.textSecondary}
                />
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.continueBtn}
                activeOpacity={0.88}
                onPress={handleNext}
              >
                <Text style={styles.continueBtnText}>Continuer</Text>
                <Feather
                  name="arrow-right"
                  size={18}
                  color={Colors.textWhite}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Step 5 CTA buttons */}
          {step === 5 && (
            <View style={styles.step5Actions}>
              <View style={styles.bottomNavRow}>
                <TouchableOpacity
                  style={styles.backBtn}
                  activeOpacity={0.7}
                  onPress={handleBack}
                >
                  <Feather
                    name="arrow-left"
                    size={18}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.backBtnText}>Retour</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.continueBtn, styles.proCtaBtn]}
                  activeOpacity={0.88}
                  onPress={() => {
                    setSelectedPlan("pro");
                    handleFinish();
                  }}
                >
                  <Text style={styles.continueBtnText}>
                    Essayer l'adaptation Pro
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={18}
                    color={Colors.textWhite}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.basicCtaBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedPlan("basic");
                  handleFinish();
                }}
              >
                <Text style={styles.basicCtaText}>
                  Continuer avec la version basique gratuite
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer info */}
        <Text style={styles.footerNote}>
          Données privées, jamais revendues.
        </Text>
      </ScrollView>

      {/* Modal Email Auth Supabase */}
      <Modal
        visible={isEmailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEmailModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsEmailModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {emailMode === "login" ? "Connexion" : "Créer un compte"}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsEmailModalVisible(false)}
              >
                <Feather name="x" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Switch Mode (Connexion / Inscription) */}
            <View style={styles.modeTabsRow}>
              <TouchableOpacity
                style={[
                  styles.modeTab,
                  emailMode === "register" && styles.modeTabActive,
                ]}
                onPress={() => {
                  setEmailMode("register");
                  setAuthErrorMessage(null);
                  setAuthInfoMessage(null);
                }}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    emailMode === "register" && styles.modeTabTextActive,
                  ]}
                >
                  Inscription
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeTab,
                  emailMode === "login" && styles.modeTabActive,
                ]}
                onPress={() => {
                  setEmailMode("login");
                  setAuthErrorMessage(null);
                  setAuthInfoMessage(null);
                }}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    emailMode === "login" && styles.modeTabTextActive,
                  ]}
                >
                  Connexion
                </Text>
              </TouchableOpacity>
            </View>

            {authErrorMessage && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorBannerText}>{authErrorMessage}</Text>
              </View>
            )}

            {authInfoMessage && (
              <View style={styles.infoBanner}>
                <Feather name="check-circle" size={16} color="#16A34A" />
                <Text style={styles.infoBannerText}>{authInfoMessage}</Text>
              </View>
            )}

            {emailMode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Nom complet</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Marius Dupont"
                  placeholderTextColor={Colors.textMuted}
                  value={fullNameInput}
                  onChangeText={setFullNameInput}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Adresse Email</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="marius@exemple.com"
                placeholderTextColor={Colors.textMuted}
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Mot de passe</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="6 caractères minimum"
                placeholderTextColor={Colors.textMuted}
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.modalQuickFillBtn}
              onPress={() => {
                setEmailInput("marius@riles.app");
                setPasswordInput("Password123!");
                if (emailMode === "register") {
                  setFullNameInput("Marius Bourse");
                }
              }}
            >
              <Feather name="zap" size={13} color={Colors.primary} />
              <Text style={styles.modalQuickFillText}>
                Remplir automatiquement pour test
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              activeOpacity={0.88}
              disabled={authLoading}
              onPress={handleEmailSubmit}
            >
              {authLoading ? (
                <ActivityIndicator size="small" color={Colors.textWhite} />
              ) : (
                <Text style={styles.modalSubmitText}>
                  {emailMode === "login" ? "Se connecter" : "Créer mon compte"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  cardContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xxl,
    ...Shadows.card,
    marginBottom: Spacing.xxl,
  },
  stepSubtitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.sizes.base,
    lineHeight: 22,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginBottom: Spacing.xxl,
  },

  // Step 1: Auth
  appleBtn: {
    backgroundColor: "#0F172A",
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  appleBtnText: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.md,
    fontWeight: "800",
  },
  googleBtn: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
    ...Shadows.subtle,
  },
  googleBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: "800",
  },
  authIcon: {
    marginRight: 10,
  },
  orDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.md,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  orText: {
    marginHorizontal: Spacing.md,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  emailOptionBtn: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  emailOptionText: {
    color: Colors.primary,
    fontSize: Typography.sizes.md,
    fontWeight: "800",
    textAlign: "center",
  },
  skipAuthBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: Spacing.xl,
    backgroundColor: "#F8FAFC",
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  skipAuthBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
  },
  termsText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  // Step 2: Goal Input
  inputLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  textInputCard: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    minHeight: 80,
    marginBottom: Spacing.md,
  },
  textInput: {
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    fontWeight: "500",
    lineHeight: 22,
    textAlignVertical: "top",
  },
  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.xxl,
  },
  lockCaption: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  // Step 3: Sports
  sportCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sportCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#FFF9F7",
  },
  sportTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  sportTitleSelected: {
    color: Colors.textPrimary,
  },

  // Step 4: Apps Grid
  appsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  appCard: {
    width: "47.5%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  appCardConnected: {
    borderColor: Colors.primary,
    backgroundColor: "#FFF9F7",
  },
  appCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  appIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  appIconLetter: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.md,
    fontWeight: "900",
    fontStyle: "italic",
  },
  appTextCol: {
    flex: 1,
  },
  appName: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  appStatusLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  appStatusConnected: {
    color: Colors.primary,
    fontWeight: "700",
  },
  skipStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xl,
  },
  skipStepText: {
    fontSize: Typography.sizes.base,
    fontWeight: "800",
    color: Colors.primary,
  },

  // Step 5: Plans
  planCard: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    position: "relative",
  },
  planCardActive: {
    borderColor: Colors.primary,
  },
  planCardPro: {
    backgroundColor: "#FFF9F7",
    borderColor: Colors.primary,
  },
  planCardProActive: {
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Shadows.subtle,
  },
  recommendedBadge: {
    position: "absolute",
    top: -12,
    right: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  recommendedText: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
  },
  planHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  planTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  planFreeText: {
    fontSize: Typography.sizes.base,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  planOfferText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
  planDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
  step5Actions: {
    marginTop: Spacing.lg,
  },
  proCtaBtn: {
    flex: 1.6,
  },
  basicCtaBtn: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  basicCtaText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
    textAlign: "center",
  },

  // Bottom Nav
  bottomNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  backBtnText: {
    fontSize: Typography.sizes.base,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  continueBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    gap: 8,
    ...Shadows.buttonAccent,
  },
  continueBtnText: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.base,
    fontWeight: "800",
  },

  // Footer Note
  footerNote: {
    textAlign: "center",
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: "600",
  },

  // Error Banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorBannerText: {
    flex: 1,
    color: "#DC2626",
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
  },

  // Info Banner
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  infoBannerText: {
    flex: 1,
    color: "#16A34A",
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
  },

  // Modal Email
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl + 16,
    ...Shadows.card,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabsRow: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
  },
  modeTabActive: {
    backgroundColor: Colors.card,
    ...Shadows.subtle,
  },
  modeTabText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  modeTabTextActive: {
    color: Colors.textPrimary,
    fontWeight: "800",
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  modalQuickFillBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: Spacing.xs,
  },
  modalQuickFillText: {
    color: Colors.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
  },
  modalSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
    ...Shadows.buttonAccent,
  },
  modalSubmitText: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.base,
    fontWeight: "800",
  },
  connectedCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    ...Shadows.card,
    marginBottom: Spacing.md,
  },
  connectedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  connectedAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  connectedTextCol: {
    flex: 1,
  },
  connectedBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: "#16A34A",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  connectedEmailText: {
    fontSize: Typography.sizes.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  continueWithAccountBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Spacing.xs,
    ...Shadows.buttonAccent,
  },
  continueWithAccountBtnText: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.base,
    fontWeight: "800",
  },
  switchAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: Spacing.xs,
  },
  switchAccountText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
