#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <AsyncMqtt_Generic.h>
#include <ArduinoJson.h>
#include <WiFi.h>

#define MQ135_pino_analogico 0
#define lm35Pino 3
#define Lcd_endereco 0x27
#define Lcd_colunas 16
#define Lcd_linhas 2
LiquidCrystal_I2C lcd(Lcd_endereco, Lcd_colunas, Lcd_linhas);

const char* ssid = "Hygeia";
const char* password = "BruniniS2**";
const char* mqtt_server = "192.168.133.69";

const char* usuario = "nba";
const char* senha = "nelena&ester";
const int mqtt_port = 1883;

const char* topico_release = "HYGEIA/RELEASE";
const char* topico_cloop   = "HYGEIA/CURRENT/LOOP";

AsyncMqttClient mqttClient;

void publishLoopMessage(float temperatura, float co2);
bool operating = false;

void onMqttMessage(char* topic, char* payload, AsyncMqttClientMessageProperties properties, size_t len, size_t index, size_t total);
void connectWiFi();
void onMqttConnect(bool sessionPresent);
void onMqttDisconnect(AsyncMqttClientDisconnectReason reason);

const float RL = 10000.0;
const float Vcc = 5.0;
float R0 = 0;  

const float A = 110.47;
const float B = -2.862;

const float TEMP_MIN = 24.0;
const float TEMP_MAX = 26.0;
const float CO2_MIN = 400.0;
const float CO2_MAX = 600.0;

void setup() {
  analogReadResolution(12);
  Wire.begin(8, 9);
  analogSetPinAttenuation(lm35Pino, ADC_0db);
  pinMode(MQ135_pino_analogico, INPUT);
  pinMode(lm35Pino, INPUT);

  Serial.begin(115200);

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Calibrando R0...");
  delay(1000);

  R0 = calibrarR0();
  Serial.print("R0 calibrado: ");
  Serial.println(R0, 0);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("R0 calibrado:");
  lcd.setCursor(0, 1);
  lcd.print(R0, 0);
  delay(3000);

  connectWiFi();
  mqttClient.onConnect(onMqttConnect);
  mqttClient.onDisconnect(onMqttDisconnect);
  mqttClient.onMessage(onMqttMessage);
  mqttClient.setCredentials(usuario, senha);
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.connect();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (operating) {
    int leituraLM35 = analogRead(lm35Pino);
    float tensaoLM35 = leituraLM35 * (3.3 / 4095.0);
    float temperatura = tensaoLM35 * 100.0;

    int leituraMQ135 = analogRead(MQ135_pino_analogico);
    float tensaoMQ135 = leituraMQ135 * (3.3 / 4095.0);
    float Vout = tensaoMQ135 * (Vcc / 3.3);
    float Rs = RL * (Vcc - Vout) / Vout;
    float ratio = Rs / R0;
    if (ratio < 0.001) ratio = 0.001;

    float ppmCO2 = A * pow(ratio, B);
    if (ppmCO2 < 0) ppmCO2 = 0;

    bool co2Alto = false;
    if (ppmCO2 > 2000) co2Alto = true;

    Serial.print("Temperatura: ");
    Serial.print(temperatura, 2);
    Serial.print(" °C, CO2: ");
    Serial.println(ppmCO2, 0);

    lcd.setCursor(0, 0);
    if (temperatura < TEMP_MIN || temperatura > TEMP_MAX || ppmCO2 < CO2_MIN || ppmCO2 > CO2_MAX) {
      lcd.print("Parametros ruins");
    } else {
      lcd.print("Parametros bons ");
    }

    lcd.setCursor(0, 1);
    lcd.print("T:");
    lcd.setCursor(2, 1);
    lcd.print(temperatura, 2);
    lcd.setCursor(7, 1);
    lcd.print(" CO2:");
    lcd.setCursor(12, 1);
    if (co2Alto) {
      lcd.print("2k+");
    } else {
      lcd.print((int)ppmCO2);
    }

    publishLoopMessage(temperatura, ppmCO2);
    delay(1000);
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Aguardando...   ");
    delay(1000);
  }
}

float calibrarR0() {
  float somaRs = 0;
  int N_AMOSTRAS_R0 = 50;
  int DELAY_MS_R0 = 200;
  for (int i = 0; i < N_AMOSTRAS_R0; i++) {
    int leitura = analogRead(MQ135_pino_analogico);
    float Vout = (leitura / 4095.0) * 3.3;
    float Rs = RL * (Vcc - Vout) / Vout;
    somaRs += Rs;
    Serial.print("Leitura "); Serial.print(i + 1);
    Serial.print(": Rs = "); Serial.println(Rs, 0);
    delay(DELAY_MS_R0);
  }
  return somaRs / N_AMOSTRAS_R0;
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi ..");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Aguardando WiFi");
  delay(1000);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print('.');
    delay(1000);
  }
  Serial.println(WiFi.localIP());
}

void onMqttConnect(bool sessionPresent) {
  Serial.println("Conectado ao Broker MQTT.");
  mqttClient.subscribe(topico_release, 1);
}

void onMqttDisconnect(AsyncMqttClientDisconnectReason reason) {
  Serial.println("Desconectado do Broker MQTT.");
  if (WiFi.isConnected()) mqttClient.connect();
}

void onMqttMessage(char* topic, char* payload, AsyncMqttClientMessageProperties properties, size_t len, size_t index, size_t total) {
  String message;
  for (unsigned int i = 0; i < len; i++) message += (char)payload[i];
  Serial.print("Mensagem recebida ["); Serial.print(topic); Serial.print("]: "); Serial.println(message);

  if (strcmp(topic, topico_release) == 0) {
    StaticJsonDocument<32> doc;
    DeserializationError error = deserializeJson(doc, payload, len);
    if (error) return;
    bool release = doc["release"];
    if (release && !operating) operating = true;
    else if (!release && operating) operating = false;
  }
}

void publishLoopMessage(float temperatura, float co2) {
  StaticJsonDocument<128> doc;
  doc["temperatura"] = temperatura;
  doc["co"] = co2;
  char buffer[128];
  size_t n = serializeJson(doc, buffer);
  mqttClient.publish(topico_cloop, 1, false, buffer, n);
  Serial.println("Mensagem de LOOP publicada:");
  Serial.println(buffer);
}
