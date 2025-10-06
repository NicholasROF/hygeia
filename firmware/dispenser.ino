#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Stepper.h>
#include <AsyncMqtt_Generic.h>
#include <ArduinoJson.h>
#include <WiFi.h>

#define Trig 19
#define Echo 23

#define Lcd_endereco 0x27
#define Lcd_colunas 20
#define Lcd_linhas 4
LiquidCrystal_I2C lcd(Lcd_endereco, Lcd_colunas, Lcd_linhas);

//const char* ssid = "alunos";
//const char* password = "etefmc123";
//const char* mqtt_server = "broker.emqx.io";

const char* mqtt_server = "192.168.133.69 ";
const char* ssid = "Hygeia";
const char* password = "BruniniS2**";

const char* usuario = "nba";
const char* senha = "nelena&ester";
const int mqtt_port = 1883;

const char* topico_release = "HYGEIA/RELEASE";
const char* topico_csetup = "HYGEIA/CURRENT/SETUP";
const char* topico_error = "HYGEIA/ERROR";

AsyncMqttClient mqttClient;

void publishSetupMessage(String bacteria, int tempo_teste_segundos, int qtd);
void publishErrorMessage(String erro);
bool operating = false;
//bool operating = true;

void connectWiFi();
void onMqttConnect(bool sessionPresent);
void onMqttDisconnect(AsyncMqttClientDisconnectReason reason);
void onMqttMessage(char* topic, char* payload, AsyncMqttClientMessageProperties properties, size_t len, size_t index, size_t total);

#define botaoParada 27
#define botaoMais 26
#define botaoEnter 33
#define botaoMenos 32

#define Passosporvolta 2048

#define IN1 14
#define IN2 16
#define IN3 17
#define IN4 18

Stepper motor(Passosporvolta, IN1, IN3, IN2, IN4);

bool posicaoOk = false;

bool botaoMais_atual = 1;
bool botaoMais_anterior = 1;
bool botaoEnter_atual = 1;
bool botaoEnter_anterior = 1;
bool botaoMenos_atual = 1;
bool botaoMenos_anterior = 1;
int tela = 1;
int antibioticos = 0;
int antibioticos1 = 0;
String nome = "";
String lista = "[";
String antibiotico = "";
float graus = 0;
float passos_float = 0;
int passos = 0;
bool proximatela = false;
bool voltacompleta = false;
float distancia = 0;
long duracao = 0;

uint8_t contador = 0;
uint8_t soma = 0;
String listaEscolhidos[6];

void botaoEmergencia(void);
bool verificarPosicao();
uint8_t somar();
String listar(int antibioticos);

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  Wire.begin(21, 22);
  pinMode(Trig, OUTPUT);
  pinMode(Echo, INPUT);
  pinMode(botaoParada, INPUT_PULLUP);
  pinMode(botaoMais, INPUT_PULLUP);
  pinMode(botaoEnter, INPUT_PULLUP);
  pinMode(botaoMenos, INPUT_PULLUP);
  motor.setSpeed(12);
  Serial.begin(115200);
  lcd.init();
  lcd.backlight();

  connectWiFi();

  Serial1.begin(115200, SERIAL_8N1, -1, 25);

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

  botaoEmergencia();

  if (operating) {

    while (posicaoOk != true) {
      botaoEmergencia();
      posicaoOk = verificarPosicao();
    }

    if (tela == 1) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Selecione a bacteria");
      lcd.setCursor(0, 2);
      lcd.print("Streptococcus spp   ");
      lcd.setCursor(0, 3);
      lcd.print(">Primeira Opcao     ");
      nome = "Streptococcus spp";
    } else if (tela == 2) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Selecione a bacteria");
      lcd.setCursor(0, 2);
      lcd.print("Moraxella           ");
      lcd.setCursor(0, 3);
      lcd.print(">Segunda Opcao      ");
      nome = "Moraxella";
    } else if (tela == 3) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Selecione a bacteria");
      lcd.setCursor(0, 2);
      lcd.print("Haemophilus         ");
      lcd.setCursor(0, 3);
      lcd.print(">Terceira Opcao      ");
      nome = "Haemophilus";
    } else if (tela == 10) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Aperte ENTER para   ");
      lcd.setCursor(0, 2);
      lcd.print("escolher o NUMERO   ");
      lcd.setCursor(0, 3);
      lcd.print("de antibioticos!    ");
    } else if (tela == 100) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("4 antibioticos      ");
      lcd.setCursor(0, 2);
      lcd.print("                    ");
      lcd.setCursor(0, 3);
      lcd.print(">Primeira Opcao     ");
      antibioticos = 4;
    } else if (tela == 200) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("5 antibioticos      ");
      lcd.setCursor(0, 2);
      lcd.print("                    ");
      lcd.setCursor(0, 3);
      lcd.print(">Segunda Opcao      ");
      antibioticos = 5;
    } else if (tela == 300) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("6 antibioticos      ");
      lcd.setCursor(0, 2);
      lcd.print("                    ");
      lcd.setCursor(0, 3);
      lcd.print(">Terceira Opcao     ");
      antibioticos = 6;
    } else if (tela == 400) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Escolha o(s) tipo(s)");
      lcd.setCursor(0, 2);
      lcd.print("Amoxicilina         ");
      lcd.setCursor(0, 3);
      lcd.print(">Primeira Opcao     ");
      antibiotico = "Amoxicilina";
    } else if (tela == 500) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Escolha o(s) tipo(s)");
      lcd.setCursor(0, 2);
      lcd.print("Azitromicina        ");
      lcd.setCursor(0, 3);
      lcd.print(">Segunda Opcao     ");
      antibiotico = "Azitromicina";
    } else if (tela == 600) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Escolha o(s) tipo(s)");
      lcd.setCursor(0, 2);
      lcd.print("Ciprofloxacino      ");
      lcd.setCursor(0, 3);
      lcd.print(">Terceira Opcao     ");
      antibiotico = "Ciprofloxacino";
    } else if (tela == 700) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Escolha o(s) tipo(s)");
      lcd.setCursor(0, 2);
      lcd.print("Cefalexina          ");
      lcd.setCursor(0, 3);
      lcd.print(">Quarta Opcao     ");
      antibiotico = "Cefalexina";
    } else if (tela == 800) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Escolha o(s) tipo(s)");
      lcd.setCursor(0, 2);
      lcd.print("Doxiciclina         ");
      lcd.setCursor(0, 3);
      lcd.print(">Quinta Opcao     ");
      antibiotico = "Doxiciclina";
    } else if (tela == 900) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Escolha o(s) tipo(s)");
      lcd.setCursor(0, 2);
      lcd.print("Clindamicina        ");
      lcd.setCursor(0, 3);
      lcd.print(">Sexta Opcao     ");
      antibiotico = "Clindamicina";
    } else if (tela == 950) {

      int antibioticos2 = somar();
      if (antibioticos2 == antibioticos) {
        delay(1000);
        tela = 1000;
      }
    } else if (tela == 1000 && proximatela == false) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Voce escolheu:      ");
      lcd.setCursor(0, 2);
      lcd.print(nome);
      lcd.setCursor(19, 2);
      lcd.print(" ");
      lcd.setCursor(0, 3);
      lcd.print("Quantidade: ");
      lcd.setCursor(12, 3);
      lcd.print(antibioticos);
      lcd.setCursor(13, 3);
      lcd.print("       ");
      delay(2000);
      proximatela = true;
      tela = 2000;
    } else if (tela == 2000) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Deseja continuar?   ");
      lcd.setCursor(0, 2);
      lcd.print("SIM                 ");
      lcd.setCursor(0, 3);
      lcd.print(">Primeira opcao     ");
    } else if (tela == 3000) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Deseja continuar?   ");
      lcd.setCursor(0, 2);
      lcd.print("VOLTAR PARA O INICIO");
      lcd.setCursor(0, 3);
      lcd.print(">Segunda opcao      ");
    } else if (tela == 20000 && !voltacompleta) {
      lcd.setCursor(0, 0);
      lcd.print("        MENU        ");
      lcd.setCursor(0, 1);
      lcd.print("Iniciando insercao  ");
      lcd.setCursor(0, 2);
      lcd.print("dos ");
      lcd.setCursor(4, 2);
      lcd.print(antibioticos);
      lcd.setCursor(5, 2);
      lcd.print(" antibioticos.");
      lcd.setCursor(0, 3);
      lcd.print("                    ");
      delay(2000);

      graus = 360 / antibioticos;
      passos_float = (graus / 360) * 2048;
      passos = round(passos_float);
      for (int i = 0; i < antibioticos; i++) {
        motor.step(passos);
        delay(500);
        Serial1.write("bruno");
        delay(5000);
      }
      lcd.clear();
      voltacompleta = true;
      delay(1000);
      publishSetupMessage(nome, 120, antibioticos);
    }
    if (voltacompleta == true) {
      botaoEmergencia();
      lcd.setCursor(0, 0);
      lcd.print("Placa pronta.       ");
      operating = false;
      for (int i = 0; i < contador; i++) {
        listaEscolhidos[i] = "";
      }
      contador = 0;
      voltacompleta = false;
      proximatela = false;
      antibioticos = 0;
      antibioticos1 = 0;
      soma = 0;
      proximatela = false;
      nome = "";
      tela = 1;
      distancia = 0;
      duracao = 0;
      posicaoOk = false;
    }

    botaoMais_atual = digitalRead(botaoMais);
    if (!botaoMais_atual && botaoMais_anterior) {
      if (tela == 1) {
        tela = 2;
      } else if (tela == 2) {
        tela = 3;
      } else if (tela == 3) {
        tela = 1;
      } else if (tela == 100) {
        tela = 200;
      } else if (tela == 200) {
        tela = 300;
      } else if (tela == 300) {
        tela = 100;
      } else if (tela == 400) {
        tela = 500;
      } else if (tela == 500) {
        tela = 600;
      } else if (tela == 600) {
        tela = 700;
      } else if (tela == 700) {
        tela = 800;
      } else if (tela == 800) {
        tela = 900;
      } else if (tela == 900) {
        tela = 400;
      } else if (tela == 2000) {
        tela = 3000;
      } else if (tela == 3000) {
        tela = 2000;
      }
      delay(30);
    }
    botaoMais_anterior = botaoMais_atual;

    botaoMenos_atual = digitalRead(botaoMenos);
    if (!botaoMenos_atual && botaoMenos_anterior) {
      if (tela == 1) {
        tela = 3;
      } else if (tela == 2) {
        tela = 1;
      } else if (tela == 3) {
        tela = 2;
      } else if (tela == 100) {
        tela = 300;
      } else if (tela == 200) {
        tela = 100;
      } else if (tela == 300) {
        tela = 200;
      } else if (tela == 400) {
        tela = 900;
      } else if (tela == 900) {
        tela = 800;
      } else if (tela == 800) {
        tela = 700;
      } else if (tela == 700) {
        tela = 600;
      } else if (tela == 600) {
        tela = 500;
      } else if (tela == 500) {
        tela = 400;
      } else if (tela == 400) {
        tela = 900;
      } else if (tela == 2000) {
        tela = 3000;
      } else if (tela == 3000) {
        tela = 2000;
      }
      delay(30);
    }
    botaoMenos_anterior = botaoMenos_atual;

    botaoEnter_atual = digitalRead(botaoEnter);
    if (!botaoEnter_atual && botaoEnter_anterior) {
      if (tela == 1) {
        tela = 10;
      } else if (tela == 2) {
        tela = 10;
      } else if (tela == 3) {
        tela = 10;
      } else if (tela == 10) {
        tela = 100;
      } else if (tela == 100) {
        tela = 400;
      } else if (tela == 200) {
        tela = 400;
      } else if (tela == 300) {
        tela = 400;
      } else if (tela == 400) {
        tela = 950;
      } else if (tela == 500) {
        tela = 950;
      } else if (tela == 600) {
        tela = 950;
      } else if (tela == 700) {
        tela = 950;
      } else if (tela == 800) {
        tela = 950;
      } else if (tela == 900) {
        tela = 950;
      } else if (tela == 2000) {
        tela = 20000;
      } else if (tela == 3000) {
        antibioticos = 0;
        antibioticos1 = 0;
        contador = 0;
        soma = 0;
        proximatela = false;
        nome = "";
        tela = 1;
      }
      delay(30);
    }
    botaoEnter_anterior = botaoEnter_atual;
  } else {
    lcd.setCursor(0, 0);
    lcd.print("Aguardando...       ");
    delay(1000);
    lcd.setCursor(0, 1);
    lcd.print("                    ");
    lcd.setCursor(0, 2);
    lcd.print("                    ");
    lcd.setCursor(0, 3);
    lcd.print("                    ");
  }
}

void botaoEmergencia(void) {
  if (digitalRead(botaoParada) == LOW) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Emergencia acionada.");
    delay(3000);
    lcd.clear();
    publishErrorMessage("Botão de emergência acionado");
    operating = false;
    contador = 0;
    voltacompleta = false;
    proximatela = false;
    antibioticos = 0;
    antibioticos1 = 0;
    soma = 0;
    proximatela = false;
    nome = "";
    tela = 1;
    distancia = 0;
    duracao = 0;
    posicaoOk = false;
  }
}

bool verificarPosicao() {
  digitalWrite(Trig, LOW);
  delayMicroseconds(2);
  digitalWrite(Trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(Trig, LOW);
  duracao = pulseIn(Echo, HIGH);
  distancia = duracao * 0.034 / 2;
  lcd.clear();
  if (distancia >= 6.9 && distancia <= 7.2) {
    lcd.setCursor(0, 0);
    lcd.print("Placa alinhada.");
    lcd.setCursor(0, 1);
    lcd.print(distancia, 2);
    delay(300);
    return true;
  } else if (distancia < 2 || distancia > 400) {
    lcd.setCursor(0, 0);
    lcd.print("Falha na medida.");
    lcd.setCursor(0, 1);
    lcd.print(distancia, 2);
    delay(300);
    return false;
  } else {
    lcd.setCursor(0, 0);
    lcd.print("Placa mal colocada");
    lcd.setCursor(0, 1);
    lcd.print(distancia, 2);
    lcd.setCursor(4, 1);
    lcd.print("cm");
    delay(300);
    return false;
  }
}

uint8_t somar() {
  int contador_especifico = 0;
  for (int i = 0; i < contador; i++) {
    if (listaEscolhidos[i] == antibiotico) {
      contador_especifico++;
    }
  }

  lcd.setCursor(0, 0);
  lcd.print("Escolha a quantidade");
  lcd.setCursor(0, 1);
  lcd.print("Qtd total ");
  lcd.setCursor(10, 1);
  lcd.print(contador);
  lcd.setCursor(11, 1);
  lcd.print("/");
  lcd.setCursor(12, 1);
  lcd.print(antibioticos);
  lcd.setCursor(13, 1);
  lcd.print("       ");
  lcd.setCursor(0, 2);
  lcd.print("Qtd do antibiotico ");
  lcd.setCursor(19, 2);
  lcd.print(contador_especifico);
  lcd.setCursor(0, 3);
  lcd.print(">Confirmar - Enter");
  delay(250);

  botaoMais_atual = digitalRead(botaoMais);
  botaoEnter_atual = digitalRead(botaoEnter);

  if (botaoMais_anterior == HIGH && botaoMais_atual == LOW) {
    delay(50);
    if (contador < antibioticos) {
      listaEscolhidos[contador] = antibiotico;
      contador++;
      listar(antibioticos);
    }
  }
  if (botaoEnter_anterior == HIGH && botaoEnter_atual == LOW) {
    delay(50);
    lcd.setCursor(0, 0);
    lcd.print("        MENU        ");
    lcd.setCursor(0, 1);
    lcd.print("Faltam:             ");
    soma = antibioticos - contador;
    lcd.setCursor(8, 1);
    lcd.print(soma);
    lcd.setCursor(10, 1);
    lcd.print("dos");
    lcd.setCursor(14, 1);
    lcd.print(antibioticos);
    lcd.setCursor(0, 2);
    lcd.print("antibioticos.       ");
    lcd.setCursor(0, 3);
    lcd.print("Selecione-os.       ");
    delay(2000);
    tela = 400;
  }

  botaoMais_anterior = botaoMais_atual;
  botaoEnter_anterior = botaoEnter_atual;

  return contador;
}

String listar(int antibioticos) {
  String lista = "[";
  for (int i = 0; i < contador; i++) {
    lista += "\"";
    lista += listaEscolhidos[i];
    lista += "\"";
    if (i < contador - 1) {
      lista += ", ";
    }
  }
  lista += "]";
  char letra = ',';
  int contador1 = 0;

  for (int i = 0; i < lista.length(); i++) {
    if (lista.charAt(i) == letra) {
      contador1++;
    }
  }

  if (contador1 + 1 == antibioticos) {
    Serial.println(lista);
    Serial.println("OK");
  }

  return lista;
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
  if (WiFi.isConnected()) {
    mqttClient.connect();
  }
}

void onMqttMessage(char* topic, char* payload, AsyncMqttClientMessageProperties properties, size_t len, size_t index, size_t total) {
  String message;
  for (unsigned int i = 0; i < len; i++) {
    message += (char)payload[i];
  }

  Serial.print("Mensagem recebida [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);

  if (strcmp(topic, topico_release) == 0) {
    StaticJsonDocument<32> doc;
    DeserializationError error = deserializeJson(doc, payload, len);
    if (error) {
      Serial.println("Erro ao analisar JSON");
      return;
    }
    bool release = doc["release"];
    if (release && !operating) {
      Serial.println("Comando de INICIAR teste recebido.");
      operating = true;

      lcd.setCursor(0, 0);
      lcd.print("Iniciando o teste!  ");
      lcd.setCursor(0, 1);
      lcd.print("Coloque a placa com ");
      lcd.setCursor(0, 2);
      lcd.print("7 cm de distancia.  ");
      delay(3000);
    } else if (!release && operating) {
      Serial.println("Comando de FINALIZAR teste recebido.");
      operating = false;
    }
  }
}

void publishSetupMessage(String bacteria, int tempo_teste_segundos, int qtd) {
  StaticJsonDocument<256> doc;
  doc["bacteria"] = bacteria;
  doc["tempo_teste_segundos"] = tempo_teste_segundos;

  JsonArray antibioticoArray = doc.createNestedArray("antibiotico");
  for (int i = 0; i < qtd; i++) {
    if (listaEscolhidos[i] != "") {
      antibioticoArray.add(listaEscolhidos[i]);
    }
  }

  char buffer[256];
  size_t n = serializeJson(doc, buffer);
  mqttClient.publish(topico_csetup, 1, false, buffer, n);

  Serial.println("Mensagem de SETUP publicada:");
  Serial.println(buffer);
}

void publishErrorMessage(String erro) {
  StaticJsonDocument<256> doc;
  doc["error"] = erro;

  char buffer[256];
  size_t n = serializeJson(doc, buffer);
  mqttClient.publish(topico_error, 1, false, buffer, n);

  Serial.println("Mensagem de ERROR publicada:");
  Serial.println(buffer);
}