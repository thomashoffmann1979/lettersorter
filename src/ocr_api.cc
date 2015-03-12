#define BUILDING_NODE_EXTENSION
#include <node.h>
#include <leptonica/allheaders.h>
#include <tesseract/baseapi.h>
#include <tesseract/strngs.h>
#include "ocr_api.h"
#include "../node_modules/opencv/src/Matrix.h"


using namespace v8;


Persistent<Function> OCRApi::constructor;


OCRApi::OCRApi() {
  ocr = new tesseract::TessBaseAPI();
};


OCRApi::~OCRApi() {
  //ocr->Clear();
  //ocr->End();
};

void OCRApi::Initialize(v8::Handle<v8::Object> exports) {
  Isolate* isolate = Isolate::GetCurrent();

  // Prepare constructor template
  Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, New);
  tpl->SetClassName(String::NewFromUtf8(isolate, "OCR"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  // Prototype
  NODE_SET_PROTOTYPE_METHOD(tpl, "Init", Init);
  NODE_SET_PROTOTYPE_METHOD(tpl, "Clear", Clear);
  NODE_SET_PROTOTYPE_METHOD(tpl, "End", End);

  NODE_SET_PROTOTYPE_METHOD(tpl, "SetImage", SetImage);
  NODE_SET_PROTOTYPE_METHOD(tpl, "SetMatrix", SetMatrix);

  constructor.Reset(isolate, tpl->GetFunction());
  exports->Set(String::NewFromUtf8(isolate, "OCR"), tpl->GetFunction());
}

void OCRApi::New(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  if (args.IsConstructCall()) {
    // Invoked as constructor: `new MyObject(...)`
    //double value = args[0]->IsUndefined() ? 0 : args[0]->NumberValue();
    OCRApi* obj = new OCRApi();
    obj->Wrap(args.This());
    args.GetReturnValue().Set(args.This());

  } else {

    // Invoked as plain function `MyObject(...)`, turn into construct call.
    const int argc = 1;
    Local<Value> argv[argc] = { args[0] };
    Local<Function> cons = Local<Function>::New(isolate, constructor);
    args.GetReturnValue().Set(cons->NewInstance(argc, argv));

  }
}

void OCRApi::End(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  OCRApi* obj = ObjectWrap::Unwrap<OCRApi>(args.This());
  obj->ocr->End();
}


void OCRApi::Clear(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  OCRApi* obj = ObjectWrap::Unwrap<OCRApi>(args.This());
  obj->ocr->Clear();
}

void OCRApi::SetMatrix(const FunctionCallbackInfo<Value>& args) {

  Matrix *im = ObjectWrap::Unwrap<Matrix>(args[0]->ToObject());


  try{
    cv::imshow("Sample", im->mat);
  } catch(cv::Exception& e ){
    const char* err_msg = e.what();
    NanThrowError(err_msg);
  }
  

	NanReturnValue(args.Holder());


  //cv::Mat gray;
  //cv::cvtColor(im, gray, CV_BGR2GRAY);

}

void OCRApi::SetImage(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  PIX* pix;

  char *lang;

  if (args.Length() == 1){
    if (args[0]->IsString()) {
      //pix = pixRead(strdup(*(String::Utf8Value(args[0]))));
    } else {
      //PixWrap* pixWrap = ObjectWrap::Unwrap<PixWrap>(args[0]->ToObject());
      //pix = pixWrap->data();
    }
  }

  if (pix == NULL) {
    //return ThrowException(Exception::Error(String("Image was not found or has unsupported format."));
    return;
  }

  OCRApi* obj = ObjectWrap::Unwrap<OCRApi>(args.This());
  obj->ocr->SetImage(pix);
}

/*
int depth;
 if(subImage.depth() == CV_8U)
    depth = 8;
 //other cases not considered yet

 PIX* pix = pixCreateHeader(subImage.size().width, subImage.size().height, depth);
 pix->data = (l_uint32*) subImage.data;
*/

void OCRApi::Init(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  OCRApi* obj = ObjectWrap::Unwrap<OCRApi>(args.This());
  char *lang;

  if (args.Length() == 1){
    v8::String::Utf8Value arg_lang(args[0]->ToString());

    if (arg_lang.length()) {
      lang = *arg_lang;
    } else {
      lang = (char *) "eng";
    }

    int ret = obj->ocr->Init(NULL, lang);
    args.GetReturnValue().Set(Boolean::New(isolate, ret == 0));
  }else{
    args.GetReturnValue().Set(Boolean::New(isolate, false ));
  }
}
