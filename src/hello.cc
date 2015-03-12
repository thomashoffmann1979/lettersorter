// hello.cc
#include <node.h>

using namespace v8;

#include <leptonica/allheaders.h>
#include <tesseract/baseapi.h>
#include <tesseract/strngs.h>

using namespace v8;


BaseApi::BaseApi() {
  ocr = new tesseract::TessBaseAPI();
};

BaseApi::~BaseApi() {
  ocr->Clear();
  ocr->End();
};


void Method(const FunctionCallbackInfo<Value>& args) {

  tesseract::TessBaseAPI api;
  int r = api.Init("", "eng", tesseract::OEM_DEFAULT, NULL, 0, NULL, NULL, false);
  if(r == 0){

  }

  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);
  args.GetReturnValue().Set(String::NewFromUtf8(isolate, "world"));
}

void init(Handle<Object> exports) {
  NODE_SET_METHOD(exports, "hello", Method);
}

NODE_MODULE(addon, init);
