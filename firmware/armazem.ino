#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ESP32Servo.h>
#include <AsyncMqtt_Generic.h>
#include <ArduinoJson.h>
#include <WiFi.h>

//const char* ssid = "alunos";
//const char* password = "etefmc123";
//const char* mqtt_server = "broker.emqx.io";

const char* ssid = "Hygeia";
const char* password = "BruniniS2**";
const char* mqtt_server = "192.168.133.69";

const char* usuario = "nba";
const char* senha = "nelena&ester";
const int mqtt_port = 1883;

const char* topico_storage = "HYGEIA/STORAGE";

AsyncMqttClient mqttClient;

void publishStorageMessage(float temperatura);
bool operating = false;

void connectWiFi();
void onMqttConnect(bool sessionPresent);
void onMqttDisconnect(AsyncMqttClientDisconnectReason reason);
void onMqttMessage(char* topic, char* payload, AsyncMqttClientMessageProperties properties, size_t len, size_t index, size_t total);


#define largura_tela 128
#define altura_tela 64
#define OLED_RESET -1
#define endereco_tela 0x3C

Adafruit_SSD1306 display(largura_tela, altura_tela, &Wire, OLED_RESET);
const int lm35pino = 3;
const int servoPin = 6;

Servo meuServo;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(3, ADC_0db);
  Serial1.begin(115200, SERIAL_8N1, 5, -1);
  Serial.println("Esperando dados UART...");
  meuServo.attach(servoPin);  // conecta o servo ao pino
  meuServo.write(0);          // posiciona o servo em 0 graus
  delay(1000);                // espera 1 segundo
  Wire.begin(8, 9);           // SDA, SCL
  if (!display.begin(SSD1306_SWITCHCAPVCC, endereco_tela)) {
    Serial.println("Falha ao iniciar o display OLED.");
    while (true);
  }

  connectWiFi();
  mqttClient.onConnect(onMqttConnect);
  mqttClient.onDisconnect(onMqttDisconnect);
  mqttClient.setCredentials(usuario, senha);
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.connect();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  String comando = "";
  while (Serial1.available() > 0) {
    char c = Serial1.read();
    Serial.print("Recebido: ");
    Serial.println(c);
    comando += c;
  }
  if (comando == "bruno") {
    meuServo.write(90);
    delay(2000);
    meuServo.write(0);
    delay(2000);
    comando = "";
  }
  int leitura = analogRead(lm35pino);
  Serial.println(leitura);
  float tensao = leitura * (3.3 / 4095.0);
  Serial.println(tensao);
  float temperatura = tensao * 100.0;
  Serial.println(temperatura);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print("Temperatura atual");
  display.setCursor(0, 8);
  display.print("dos antibioticos:");
  display.setTextSize(4);
  display.setCursor(0, 24);
  display.println(temperatura);
  display.setTextSize(1);
  display.setCursor(16, 56);
  display.print(" Graus celsius");
  display.display();

  publishStorageMessage(temperatura);

  delay(1000);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi ..");
  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print("Aguardando WiFi");
  display.display();
  delay(1000);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print('.');
    delay(1000);
  }
  Serial.println(WiFi.localIP());
}

void onMqttConnect(bool sessionPresent) {
  Serial.println("Conectado ao Broker MQTT.");
}

void onMqttDisconnect(AsyncMqttClientDisconnectReason reason) {
  Serial.println("Desconectado do Broker MQTT.");
  if (WiFi.isConnected()) {
    mqttClient.connect();
  }
}

void publishStorageMessage(float temperatura) {
  StaticJsonDocument<128> doc;
  doc["permission"] = temperatura;

  char buffer[128];
  size_t n = serializeJson(doc, buffer);
  mqttClient.publish(topico_storage, 1, false, buffer, n);

  Serial.println("Mensagem de STORAGE publicada:");
  Serial.println(buffer);
}
